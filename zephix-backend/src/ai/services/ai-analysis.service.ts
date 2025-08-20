import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  AIAnalysisRepository,
  AIAnalysisFilters,
  PaginationOptions,
  AIAnalysisStats,
} from '../repositories/ai-analysis.repository';
import {
  AIAnalysis,
  AnalysisStatus,
  AnalysisType,
  ConfidenceLevel,
} from '../entities/ai-analysis.entity';
import { AIConfigService } from '../config/ai-config.service';
import { DocumentParserService } from '../document-parser.service';
import { LLMProviderService } from '../llm-provider.service';
import { VectorDatabaseService } from '../vector-database.service';
import { EmbeddingService } from '../embedding.service';
import { QueueService } from '../../shared/services/queue.service';
import { AuditService } from '../../shared/services/audit.service';
import { FileValidationService } from '../../shared/services/file-validation.service';
import { VirusScanService } from '../../shared/services/virus-scan.service';

export interface AnalysisRequest {
  document: Express.Multer.File;
  type: AnalysisType;
  options: {
    analysisDepth: string;
    extractFields: string[];
    includeMetadata: boolean;
    generateInsights: boolean;
    costLimit: number;
    timeoutSeconds: number;
  };
  userId: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AnalysisResult {
  id: string;
  status: AnalysisStatus;
  progress: number;
  estimatedCompletion?: Date;
  result?: any;
  error?: string;
}

export interface AnalysisProgress {
  id: string;
  status: AnalysisStatus;
  progress: number;
  currentStep: string;
  estimatedCompletion?: Date;
  result?: any;
  error?: string;
}

@Injectable()
export class AIAnalysisService {
  private readonly logger = new Logger(AIAnalysisService.name);
  private readonly maxConcurrentAnalyses: number;
  private readonly enableAsyncProcessing: boolean;
  private readonly enableCostTracking: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiConfigService: AIConfigService,
    private readonly aiAnalysisRepository: AIAnalysisRepository,
    private readonly documentParserService: DocumentParserService,
    private readonly llmProviderService: LLMProviderService,
    private readonly vectorDatabaseService: VectorDatabaseService,
    private readonly embeddingService: EmbeddingService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly fileValidationService: FileValidationService,
    private readonly virusScanService: VirusScanService,
  ) {
    this.maxConcurrentAnalyses = this.configService.get<number>(
      'AI_MAX_CONCURRENT_ANALYSES',
      10,
    );
    this.enableAsyncProcessing = this.configService.get<boolean>(
      'AI_ENABLE_ASYNC_PROCESSING',
      true,
    );
    this.enableCostTracking = this.configService.get<boolean>(
      'AI_ENABLE_COST_TRACKING',
      true,
    );
  }

  async startAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      this.logger.log(
        `Starting AI analysis for document: ${request.document.originalname}`,
      );

      // Validate request
      await this.validateAnalysisRequest(request);

      // Check organization limits
      await this.checkOrganizationLimits(request.organizationId);

      // Create analysis record
      const analysis = await this.createAnalysisRecord(request);

      // Process document based on configuration
      if (this.enableAsyncProcessing) {
        await this.queueAnalysis(analysis.id, request);
        return {
          id: analysis.id,
          status: AnalysisStatus.PENDING,
          progress: 0,
        };
      } else {
        // Synchronous processing for small documents
        return await this.processAnalysisSynchronously(analysis.id, request);
      }
    } catch (error) {
      this.logger.error(
        `Failed to start analysis: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to start analysis: ${error.message}`,
      );
    }
  }

  async getAnalysisStatus(
    analysisId: string,
    organizationId: string,
    userId: string,
  ): Promise<AnalysisProgress> {
    try {
      const analysis = await this.aiAnalysisRepository.findById(
        analysisId,
        organizationId,
      );

      // Audit access
      this.auditService.logAccess('ai_analysis_status', {
        analysisId,
        userId,
        organizationId,
        status: analysis.status,
      });

      return {
        id: analysis.id,
        status: analysis.status,
        progress: analysis.getProgress(),
        currentStep: this.getCurrentStep(analysis),
        estimatedCompletion: analysis.getEstimatedCompletion() || undefined,
        result: analysis.isCompleted() ? analysis.analysisResult : undefined,
        error: analysis.isFailed()
          ? analysis.metadata.errorDetails?.message
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get analysis status: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get analysis status');
    }
  }

  async getAnalysisResult(
    analysisId: string,
    organizationId: string,
    userId: string,
  ): Promise<AIAnalysis> {
    try {
      const analysis = await this.aiAnalysisRepository.findById(
        analysisId,
        organizationId,
      );

      if (!analysis.isCompleted()) {
        throw new BadRequestException('Analysis is not yet completed');
      }

      // Audit access
      this.auditService.logAccess('ai_analysis_result', {
        analysisId,
        userId,
        organizationId,
        confidenceScore: analysis.confidenceScore,
      });

      return analysis;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to get analysis result: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get analysis result');
    }
  }

  async listAnalyses(
    organizationId: string,
    filters: AIAnalysisFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{
    analyses: AIAnalysis[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      return await this.aiAnalysisRepository.findByOrganization(
        organizationId,
        filters,
        pagination,
      );
    } catch (error) {
      this.logger.error(
        `Failed to list analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to list analyses');
    }
  }

  async getUserAnalyses(
    userId: string,
    organizationId: string,
    filters: AIAnalysisFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{
    analyses: AIAnalysis[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      return await this.aiAnalysisRepository.findByUser(
        userId,
        organizationId,
        filters,
        pagination,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get user analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get user analyses');
    }
  }

  async getAnalysisStats(
    organizationId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<AIAnalysisStats> {
    try {
      return await this.aiAnalysisRepository.getStats(
        organizationId,
        dateRange,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get analysis stats: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get analysis stats');
    }
  }

  async cancelAnalysis(
    analysisId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const analysis = await this.aiAnalysisRepository.findById(
        analysisId,
        organizationId,
      );

      if (!analysis.isActive()) {
        throw new BadRequestException(
          'Analysis cannot be cancelled in its current state',
        );
      }

      // Update status
      await this.aiAnalysisRepository.updateStatus(
        analysisId,
        organizationId,
        AnalysisStatus.CANCELLED,
        userId,
        { cancelledBy: userId, cancelledAt: new Date() },
      );

      // Remove from queue if pending
      if (analysis.status === AnalysisStatus.PENDING) {
        await this.queueService.remove('process-analysis', analysisId);
      }

      // Audit action
      this.auditService.logAction('ai_analysis_cancelled', {
        analysisId,
        userId,
        organizationId,
        previousStatus: analysis.status,
      });

      this.logger.log(`Analysis cancelled successfully: ${analysisId}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to cancel analysis: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to cancel analysis');
    }
  }

  async retryAnalysis(
    analysisId: string,
    organizationId: string,
    userId: string,
  ): Promise<AnalysisResult> {
    try {
      const analysis = await this.aiAnalysisRepository.findById(
        analysisId,
        organizationId,
      );

      if (!analysis.canRetry()) {
        throw new BadRequestException('Analysis cannot be retried');
      }

      // Reset analysis for retry
      await this.aiAnalysisRepository.update(analysisId, organizationId, {
        status: AnalysisStatus.PENDING,
        retryCount: analysis.retryCount + 1,
        nextRetryAt: undefined,
        metadata: {
          ...analysis.metadata,
        },
      });

      // Queue for processing
      await this.queueAnalysis(analysisId, {
        document: {
          originalname: analysis.documentName,
        } as Express.Multer.File,
        type: analysis.type,
        options: analysis.processingOptions,
        userId,
        organizationId,
      });

      // Audit action
      this.auditService.logAction('ai_analysis_retry', {
        analysisId,
        userId,
        organizationId,
        retryCount: analysis.retryCount + 1,
      });

      return {
        id: analysisId,
        status: AnalysisStatus.PENDING,
        progress: 0,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to retry analysis: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retry analysis');
    }
  }

  async cleanupOldAnalyses(
    organizationId: string,
    daysOld: number = 90,
  ): Promise<number> {
    try {
      const cleanedCount = await this.aiAnalysisRepository.cleanupOldAnalyses(
        organizationId,
        daysOld,
      );

      this.logger.log(
        `Cleaned up ${cleanedCount} old analyses for organization: ${organizationId}`,
      );

      // Audit cleanup
      this.auditService.logAction('ai_analysis_cleanup', {
        organizationId,
        daysOld,
        cleanedCount,
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to cleanup old analyses');
    }
  }

  // Private methods
  private async validateAnalysisRequest(
    request: AnalysisRequest,
  ): Promise<void> {
    // Validate file
    await this.fileValidationService.validateFile(request.document);

    // Virus scan
    if (this.aiConfigService.virusScanningEnabled) {
      const scanResult = await this.virusScanService.scanFile(
        request.document.buffer,
        request.document.originalname,
      );
      if (!scanResult.isClean) {
        throw new BadRequestException(
          `File failed virus scan: ${scanResult.threats.join(', ')}`,
        );
      }
    }

    // Validate file size
    if (request.document.size > this.aiConfigService.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.aiConfigService.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Validate file type
    const allowedTypes = this.aiConfigService.allowedFileTypes;
    if (!allowedTypes.includes(request.document.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate cost limit
    if (request.options.costLimit > this.aiConfigService.maxCostPerAnalysis) {
      throw new BadRequestException(
        `Cost limit exceeds maximum allowed cost of $${this.aiConfigService.maxCostPerAnalysis}`,
      );
    }
  }

  private async checkOrganizationLimits(organizationId: string): Promise<void> {
    const activeAnalyses = await this.aiAnalysisRepository.findByStatus(
      organizationId,
      AnalysisStatus.PROCESSING,
    );

    if (activeAnalyses.length >= this.maxConcurrentAnalyses) {
      throw new BadRequestException(
        `Organization has reached the maximum limit of ${this.maxConcurrentAnalyses} concurrent analyses`,
      );
    }

    // Check daily cost limit
    if (this.enableCostTracking) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await this.aiAnalysisRepository.getStats(organizationId, {
        start: today,
        end: tomorrow,
      });

      if (stats.totalCost > this.aiConfigService.maxDailyCost) {
        throw new BadRequestException(
          `Organization has reached the daily cost limit of $${this.aiConfigService.maxDailyCost}`,
        );
      }
    }
  }

  private async createAnalysisRecord(
    request: AnalysisRequest,
  ): Promise<AIAnalysis> {
    const documentHash = this.generateDocumentHash(request.document);

    const analysis = await this.aiAnalysisRepository.create({
      organizationId: request.organizationId,
      userId: request.userId,
      documentName: request.document.originalname,
      documentHash,
      documentType: request.document.mimetype,
      documentSize: request.document.size,
      type: request.type,
      status: AnalysisStatus.PENDING,
      processingOptions: request.options,
      metadata: {
        modelVersion: this.aiConfigService.openaiModel,
        processingSteps: [],
        qualityMetrics: {},
        externalServiceCalls: [],
      },
      auditTrail: [
        {
          action: 'analysis_created',
          timestamp: new Date(),
          userId: request.userId,
          details: {
            documentName: request.document.originalname,
            documentSize: request.document.size,
            analysisType: request.type,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
          },
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
      ],
    });

    // Audit creation
    this.auditService.logAction('ai_analysis_created', {
      analysisId: analysis.id,
      userId: request.userId,
      organizationId: request.organizationId,
      documentName: request.document.originalname,
      analysisType: request.type,
    });

    return analysis;
  }

  private generateDocumentHash(file: Express.Multer.File): string {
    return createHash('sha256')
      .update(file.buffer)
      .update(file.originalname)
      .update(file.size.toString())
      .digest('hex');
  }

  private async queueAnalysis(
    analysisId: string,
    request: AnalysisRequest,
  ): Promise<void> {
    await this.queueService.add(
      'process-analysis',
      {
        analysisId,
        request,
      },
      {
        delay: 1000, // 1 second delay
        attempts: 3,
        backoff: 'exponential',
      },
    );
  }

  private async processAnalysisSynchronously(
    analysisId: string,
    request: AnalysisRequest,
  ): Promise<AnalysisResult> {
    try {
      // Update status to processing
      await this.aiAnalysisRepository.updateStatus(
        analysisId,
        request.organizationId,
        AnalysisStatus.PROCESSING,
        request.userId,
      );

      // Parse document
      const parsedContent = await this.documentParserService.parseDocument(
        request.document.buffer,
        request.document.originalname,
        analysisId,
      );

      if (!parsedContent.success || !parsedContent.document) {
        throw new Error(parsedContent.error || 'Failed to parse document');
      }

      // Generate embeddings
      const embeddings = await this.embeddingService.generateChunkEmbeddings(
        parsedContent.document.content,
      );

      // Store in vector database
      await this.vectorDatabaseService.storeDocumentChunks(
        analysisId,
        parsedContent.document.content,
        embeddings,
      );

      // Prepare text for LLM analysis
      const fullText = parsedContent.document.content
        .map((c) => c.content)
        .join('\n');

      // Analyze with LLM
      const llmResponse = await this.llmProviderService.sendRequest({
        prompt: fullText,
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 4000,
      });

      // Create analysis result structure
      const analysisResult = {
        extractedRequirements: [],
        identifiedRisks: [],
        timelineEstimates: {
          optimistic: 0,
          realistic: 0,
          pessimistic: 0,
          unit: 'days',
          confidence: 0,
        },
        costEstimates: {
          development: 0,
          testing: 0,
          deployment: 0,
          maintenance: 0,
          total: 0,
          currency: 'USD',
        },
        stakeholderMapping: [],
        technicalSpecifications: {
          architecture: '',
          technologies: [],
          integrations: [],
          constraints: [],
          assumptions: [],
        },
        rawLLMResponse: llmResponse.content,
      };

      // Update with results
      await this.aiAnalysisRepository.update(
        analysisId,
        request.organizationId,
        {
          status: AnalysisStatus.COMPLETED,
          analysisResult: analysisResult,
          confidenceScore: this.calculateConfidenceScore(analysisResult),
          confidenceLevel: this.determineConfidenceLevel(analysisResult),
        },
      );

      return {
        id: analysisId,
        status: AnalysisStatus.COMPLETED,
        progress: 100,
        result: analysisResult,
      };
    } catch (error) {
      // Set error and update status
      await this.aiAnalysisRepository.setError(
        analysisId,
        request.organizationId,
        error,
        request.userId,
      );

      return {
        id: analysisId,
        status: AnalysisStatus.FAILED,
        progress: 0,
        error: error.message,
      };
    }
  }

  private calculateConfidenceScore(result: any): number {
    // Implement confidence scoring logic based on analysis quality
    let score = 0.5; // Base score

    if (result.extractedRequirements?.length > 0) score += 0.2;
    if (result.identifiedRisks?.length > 0) score += 0.1;
    if (result.timelineEstimates) score += 0.1;
    if (result.costEstimates) score += 0.1;

    return Math.min(1.0, score);
  }

  private determineConfidenceLevel(result: any): ConfidenceLevel {
    const score = this.calculateConfidenceScore(result);

    if (score >= 0.8) return ConfidenceLevel.VERY_HIGH;
    if (score >= 0.6) return ConfidenceLevel.HIGH;
    if (score >= 0.4) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  private getCurrentStep(analysis: AIAnalysis): string {
    switch (analysis.status) {
      case AnalysisStatus.PENDING:
        return 'Queued for processing';
      case AnalysisStatus.PROCESSING:
        return 'Analyzing document';
      case AnalysisStatus.COMPLETED:
        return 'Analysis completed';
      case AnalysisStatus.FAILED:
        return 'Analysis failed';
      case AnalysisStatus.CANCELLED:
        return 'Analysis cancelled';
      default:
        return 'Unknown status';
    }
  }
}
