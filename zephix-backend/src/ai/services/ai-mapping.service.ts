import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DocumentParserService } from '../document-parser.service';
import { LLMProviderService } from '../llm-provider.service';
import { VectorDatabaseService } from '../vector-database.service';
import { EmbeddingService } from '../embedding.service';
import { AIMappingRequestDto, AIMappingResponseDto, AIMappingStatusDto } from '../dto/ai-mapping.dto';

export interface DocumentAnalysisResult {
  projectObjectives: string[];
  scope: {
    included: string[];
    excluded: string[];
    assumptions: string[];
    constraints: string[];
  };
  stakeholders: Array<{
    name: string;
    role: string;
    responsibilities: string[];
    influence: 'high' | 'medium' | 'low';
  }>;
  timeline: {
    estimatedDuration: string;
    milestones: Array<{
      name: string;
      description: string;
      estimatedDate: string;
      dependencies: string[];
    }>;
  };
  resources: {
    humanResources: Array<{
      role: string;
      skillLevel: string;
      quantity: number;
      availability: string;
    }>;
    technicalResources: string[];
    budget: {
      estimated: number;
      currency: string;
      breakdown: Record<string, number>;
    };
  };
  risks: Array<{
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string[];
    owner: string;
  }>;
  dependencies: Array<{
    description: string;
    type: 'internal' | 'external' | 'technical' | 'business';
    criticality: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
  successCriteria: Array<{
    criterion: string;
    metric: string;
    target: string;
    measurementMethod: string;
  }>;
  kpis: Array<{
    name: string;
    description: string;
    target: number;
    unit: string;
    frequency: string;
  }>;
}

@Injectable()
export class AIMappingService {
  private readonly logger = new Logger(AIMappingService.name);
  private readonly maxFileSize: number;
  private readonly allowedFileTypes: string[];
  private readonly openaiApiKey: string;
  private readonly virusScanningEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly documentParserService: DocumentParserService,
    private readonly llmProviderService: LLMProviderService,
    private readonly vectorDatabaseService: VectorDatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.maxFileSize = this.configService.get<number>('AI_MAX_FILE_SIZE', 25 * 1024 * 1024); // 25MB
    this.allowedFileTypes = this.configService.get<string[]>('AI_ALLOWED_FILE_TYPES', ['.pdf', '.docx', '.doc', '.txt']);
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.virusScanningEnabled = this.configService.get<boolean>('AI_VIRUS_SCANNING_ENABLED', true);
  }

  async analyzeDocument(
    file: Express.Multer.File,
    request: AIMappingRequestDto,
    organizationId: string,
    userId: string,
  ): Promise<AIMappingResponseDto> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate analysis ID
      const analysisId = uuidv4();
      const startTime = Date.now();

      // Log analysis start
      this.logger.log(`Starting AI analysis for document: ${file.originalname}, ID: ${analysisId}`);

      // Start async processing
      this.processDocumentAsync(analysisId, file, request, organizationId, userId);

      // Return immediate response
      return {
        id: analysisId,
        status: 'pending',
        documentName: file.originalname,
        documentType: request.documentType,
        analysis: undefined,
        confidence: 0,
        processingTime: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        userId,
      };
    } catch (error) {
      this.logger.error(`Document analysis failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Document analysis failed: ${error.message}`);
    }
  }

  async getAnalysisResult(analysisId: string, organizationId: string): Promise<AIMappingResponseDto> {
    try {
      // TODO: Implement database retrieval
      // For now, throw not implemented
      throw new BadRequestException('Analysis result retrieval not yet implemented - database integration required');
    } catch (error) {
      this.logger.error(`Failed to retrieve analysis result: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAnalysisStatus(analysisId: string, organizationId: string): Promise<AIMappingStatusDto> {
    try {
      // TODO: Implement database status retrieval
      // For now, throw not implemented
      throw new BadRequestException('Status retrieval not yet implemented - database integration required');
    } catch (error) {
      this.logger.error(`Failed to retrieve analysis status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async listAnalyses(
    organizationId: string,
    status?: string,
    documentType?: string,
    limit = 20,
    offset = 0,
  ): Promise<AIMappingResponseDto[]> {
    try {
      // TODO: Implement database listing with pagination
      // For now, return empty array
      this.logger.log(`Listing analyses for organization: ${organizationId}`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to list analyses: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to list analyses');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.allowedFileTypes.includes(`.${fileExtension}`)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${this.allowedFileTypes.join(', ')}`);
    }

    // TODO: Implement virus scanning if enabled
    if (this.virusScanningEnabled) {
      this.logger.warn('Virus scanning not yet implemented - security risk');
    }
  }

  private async processDocumentAsync(
    analysisId: string,
    file: Express.Multer.File,
    request: AIMappingRequestDto,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Processing document asynchronously: ${analysisId}`);

      // Step 1: Parse document content
      const documentContent = await this.documentParserService.parseDocument(file);
      this.logger.log(`Document parsed successfully: ${analysisId}`);

      // Step 2: Generate embeddings for semantic search
      const embeddings = await this.embeddingService.generateEmbeddings(documentContent);
      this.logger.log(`Embeddings generated: ${analysisId}`);

      // Step 3: Store in vector database for future reference
      await this.vectorDatabaseService.storeDocument(analysisId, documentContent, embeddings, {
        organizationId,
        userId,
        documentType: request.documentType,
      });
      this.logger.log(`Document stored in vector database: ${analysisId}`);

      // Step 4: Use LLM for analysis
      const analysisResult = await this.performLLMAnalysis(documentContent, request);
      this.logger.log(`LLM analysis completed: ${analysisId}`);

      // Step 5: Store results in database
      await this.storeAnalysisResults(analysisId, analysisResult, organizationId, userId);
      this.logger.log(`Analysis results stored: ${analysisId}`);

      // Step 6: Update status to completed
      await this.updateAnalysisStatus(analysisId, 'completed', 100, 'Analysis completed successfully');
      this.logger.log(`Analysis completed successfully: ${analysisId}`);

    } catch (error) {
      this.logger.error(`AI analysis failed for ${analysisId}: ${error.message}`, error.stack);
      
      // Update status to failed
      await this.updateAnalysisStatus(analysisId, 'failed', 0, `Analysis failed: ${error.message}`);
      
      // TODO: Implement proper error notification system
      this.notifyAnalysisFailure(analysisId, error.message, organizationId, userId);
    }
  }

  private async performLLMAnalysis(
    documentContent: string,
    request: AIMappingRequestDto,
  ): Promise<DocumentAnalysisResult> {
    try {
      if (!this.openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Create analysis prompt based on document type and depth
      const prompt = this.createAnalysisPrompt(documentContent, request);
      
      // Use LLM service for analysis
      const llmResponse = await this.llmProviderService.analyzeDocument(prompt, {
        model: 'gpt-4',
        temperature: 0.1, // Low temperature for consistent analysis
        maxTokens: 4000,
      });

      // Parse and validate LLM response
      const analysisResult = this.parseLLMResponse(llmResponse);
      
      return analysisResult;
    } catch (error) {
      this.logger.error(`LLM analysis failed: ${error.message}`, error.stack);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  private createAnalysisPrompt(documentContent: string, request: AIMappingRequestDto): string {
    const depthInstructions = {
      [AnalysisDepth.BASIC]: 'Provide a high-level summary focusing on key objectives and timeline.',
      [AnalysisDepth.DETAILED]: 'Provide comprehensive analysis including stakeholders, resources, and risks.',
      [AnalysisDepth.COMPREHENSIVE]: 'Provide exhaustive analysis with detailed breakdowns, dependencies, and success metrics.',
    };

    return `
      Analyze the following ${request.documentType.toUpperCase()} document and extract structured information.
      
      ${depthInstructions[request.analysisDepth]}
      
      Focus on extracting:
      - Project objectives and scope
      - Key stakeholders and their roles
      - Timeline estimates and milestones
      - Resource requirements (human and technical)
      - Risk factors and mitigation strategies
      - Dependencies and constraints
      - Success criteria and KPIs
      
      Document Content:
      ${documentContent.substring(0, 8000)}${documentContent.length > 8000 ? '...' : ''}
      
      Return the analysis in the following JSON format:
      {
        "projectObjectives": ["objective1", "objective2"],
        "scope": {
          "included": ["item1", "item2"],
          "excluded": ["item1", "item2"],
          "assumptions": ["assumption1", "assumption2"],
          "constraints": ["constraint1", "constraint2"]
        },
        "stakeholders": [
          {
            "name": "Stakeholder Name",
            "role": "Role Description",
            "responsibilities": ["responsibility1", "responsibility2"],
            "influence": "high|medium|low"
          }
        ],
        "timeline": {
          "estimatedDuration": "6 months",
          "milestones": [
            {
              "name": "Milestone Name",
              "description": "Description",
              "estimatedDate": "2024-06-01",
              "dependencies": ["dependency1", "dependency2"]
            }
          ]
        },
        "resources": {
          "humanResources": [
            {
              "role": "Role Title",
              "skillLevel": "Senior|Mid|Junior",
              "quantity": 2,
              "availability": "Full-time|Part-time"
            }
          ],
          "technicalResources": ["resource1", "resource2"],
          "budget": {
            "estimated": 500000,
            "currency": "USD",
            "breakdown": {"development": 300000, "testing": 100000, "deployment": 100000}
          }
        },
        "risks": [
          {
            "description": "Risk description",
            "probability": "high|medium|low",
            "impact": "high|medium|low",
            "mitigation": ["strategy1", "strategy2"],
            "owner": "Owner Name"
          }
        ],
        "dependencies": [
          {
            "description": "Dependency description",
            "type": "internal|external|technical|business",
            "criticality": "high|medium|low",
            "timeline": "When needed"
          }
        ],
        "successCriteria": [
          {
            "criterion": "Success criterion",
            "metric": "Measurement metric",
            "target": "Target value",
            "measurementMethod": "How to measure"
          }
        ],
        "kpis": [
          {
            "name": "KPI Name",
            "description": "KPI Description",
            "target": 95,
            "unit": "percentage",
            "frequency": "monthly"
          }
        ]
      }
    `;
  }

  private parseLLMResponse(llmResponse: string): DocumentAnalysisResult {
    try {
      // Extract JSON from LLM response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format - no JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      this.validateAnalysisResult(parsed);
      
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${error.message}`);
      throw new Error(`Failed to parse AI analysis: ${error.message}`);
    }
  }

  private validateAnalysisResult(result: any): void {
    const requiredFields = ['projectObjectives', 'scope', 'stakeholders', 'timeline', 'resources', 'risks', 'dependencies', 'successCriteria', 'kpis'];
    
    for (const field of requiredFields) {
      if (!result[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  private async storeAnalysisResults(
    analysisId: string,
    results: DocumentAnalysisResult,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // TODO: Implement database storage
    this.logger.log(`Storing analysis results for: ${analysisId}`);
  }

  private async updateAnalysisStatus(
    analysisId: string,
    status: string,
    progress: number,
    message: string,
  ): Promise<void> {
    // TODO: Implement database status update
    this.logger.log(`Updating status for ${analysisId}: ${status} - ${progress}% - ${message}`);
  }

  private async notifyAnalysisFailure(
    analysisId: string,
    errorMessage: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // TODO: Implement notification system
    this.logger.error(`Analysis failure notification for ${analysisId}: ${errorMessage}`);
  }
}
