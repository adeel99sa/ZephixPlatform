import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, Between, LessThan } from 'typeorm';
import {
  AIAnalysis,
  AnalysisStatus,
  AnalysisType,
  ConfidenceLevel,
} from '../entities/ai-analysis.entity';

export interface AIAnalysisFilters {
  status?: AnalysisStatus;
  type?: AnalysisType;
  confidenceLevel?: ConfidenceLevel;
  dateRange?: {
    start: Date;
    end: Date;
  };
  documentType?: string;
  minConfidence?: number;
  maxCost?: number;
  hasErrors?: boolean;
}

export interface AIAnalysisStats {
  total: number;
  byStatus: Record<AnalysisStatus, number>;
  byType: Record<AnalysisType, number>;
  byConfidence: Record<ConfidenceLevel, number>;
  averageProcessingTime: number;
  totalCost: number;
  successRate: number;
  errorRate: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class AIAnalysisRepository {
  private readonly logger = new Logger(AIAnalysisRepository.name);
  private readonly maxPageSize = 100;
  private readonly defaultPageSize = 20;

  constructor(
    @InjectRepository(AIAnalysis)
    private readonly aiAnalysisRepository: Repository<AIAnalysis>,
  ) {}

  async create(analysis: Partial<AIAnalysis>): Promise<AIAnalysis> {
    try {
      this.logger.log(
        `Creating AI analysis for document: ${analysis.documentName}`,
      );

      const newAnalysis = this.aiAnalysisRepository.create(analysis);
      const savedAnalysis = await this.aiAnalysisRepository.save(newAnalysis);

      this.logger.log(`AI analysis created successfully: ${savedAnalysis.id}`);
      return savedAnalysis;
    } catch (error) {
      this.logger.error(
        `Failed to create AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error.code === '23505') {
        // Unique constraint violation
        throw new BadRequestException('Document with this hash already exists');
      }

      throw new InternalServerErrorException('Failed to create AI analysis');
    }
  }

  async findById(id: string, organizationId: string): Promise<AIAnalysis> {
    try {
      const analysis = await this.aiAnalysisRepository.findOne({
        where: { id, organizationId },
        relations: ['organization', 'user'],
      });

      if (!analysis) {
        throw new NotFoundException(`AI analysis not found: ${id}`);
      }

      return analysis;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to retrieve AI analysis: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve AI analysis');
    }
  }

  async findByOrganization(
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
      // Validate pagination
      const page = Math.max(1, pagination.page);
      const limit = Math.min(
        this.maxPageSize,
        Math.max(1, pagination.limit || this.defaultPageSize),
      );
      const offset = (page - 1) * limit;

      // Build query with security-first approach
      const queryBuilder = this.buildSecureQuery(organizationId, filters);

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination and sorting
      this.applyPaginationAndSorting(queryBuilder, pagination, offset, limit);

      // Execute query
      const analyses = await queryBuilder.getMany();

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Retrieved ${analyses.length} analyses for organization: ${organizationId}`,
      );

      return {
        analyses,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve AI analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve AI analyses');
    }
  }

  async findByUser(
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
      const page = Math.max(1, pagination.page);
      const limit = Math.min(
        this.maxPageSize,
        Math.max(1, pagination.limit || this.defaultPageSize),
      );
      const offset = (page - 1) * limit;

      const queryBuilder = this.buildSecureQuery(
        organizationId,
        filters,
      ).andWhere('analysis.userId = :userId', { userId });

      const total = await queryBuilder.getCount();
      this.applyPaginationAndSorting(queryBuilder, pagination, offset, limit);
      const analyses = await queryBuilder.getMany();

      const totalPages = Math.ceil(total / limit);

      return {
        analyses,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve user AI analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve user AI analyses',
      );
    }
  }

  async findByStatus(
    organizationId: string,
    status: AnalysisStatus,
    limit: number = 50,
  ): Promise<AIAnalysis[]> {
    try {
      return await this.aiAnalysisRepository.find({
        where: { organizationId, status },
        order: { createdAt: 'DESC' },
        take: Math.min(limit, this.maxPageSize),
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve analyses by status: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve analyses by status',
      );
    }
  }

  async findPendingAnalyses(
    organizationId: string,
    limit: number = 10,
  ): Promise<AIAnalysis[]> {
    try {
      return await this.aiAnalysisRepository.find({
        where: {
          organizationId,
          status: AnalysisStatus.PENDING,
          nextRetryAt: LessThan(new Date()),
        },
        order: { createdAt: 'ASC' },
        take: Math.min(limit, this.maxPageSize),
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve pending analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve pending analyses',
      );
    }
  }

  async findFailedAnalyses(
    organizationId: string,
    limit: number = 20,
  ): Promise<AIAnalysis[]> {
    try {
      return await this.aiAnalysisRepository.find({
        where: {
          organizationId,
          status: AnalysisStatus.FAILED,
          retryCount: LessThan(3),
        },
        order: { failedAt: 'DESC' },
        take: Math.min(limit, this.maxPageSize),
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve failed analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve failed analyses',
      );
    }
  }

  async update(
    id: string,
    organizationId: string,
    updates: Partial<AIAnalysis>,
  ): Promise<AIAnalysis> {
    try {
      this.logger.log(`Updating AI analysis: ${id}`);

      const result = await this.aiAnalysisRepository.update(
        { id, organizationId },
        { ...updates, updatedAt: new Date() },
      );

      if (result.affected === 0) {
        throw new NotFoundException(`AI analysis not found: ${id}`);
      }

      // Return updated analysis
      return await this.findById(id, organizationId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to update AI analysis: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update AI analysis');
    }
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: AnalysisStatus,
    userId: string,
    details?: Record<string, any>,
  ): Promise<AIAnalysis> {
    try {
      const analysis = await this.findById(id, organizationId);
      analysis.updateStatus(status, userId, details);

      return await this.aiAnalysisRepository.save(analysis);
    } catch (error) {
      this.logger.error(
        `Failed to update analysis status: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update analysis status',
      );
    }
  }

  async incrementRetryCount(id: string, organizationId: string): Promise<void> {
    try {
      const analysis = await this.findById(id, organizationId);
      analysis.incrementRetryCount();

      await this.aiAnalysisRepository.save(analysis);
    } catch (error) {
      this.logger.error(
        `Failed to increment retry count: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to increment retry count');
    }
  }

  async addExternalServiceCall(
    id: string,
    organizationId: string,
    service: string,
    duration: number,
    success: boolean,
    cost: number,
  ): Promise<void> {
    try {
      const analysis = await this.findById(id, organizationId);
      analysis.addExternalServiceCall(service, duration, success, cost);

      await this.aiAnalysisRepository.save(analysis);
    } catch (error) {
      this.logger.error(
        `Failed to add external service call: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to add external service call',
      );
    }
  }

  async setError(
    id: string,
    organizationId: string,
    error: Error,
    userId: string,
  ): Promise<void> {
    try {
      const analysis = await this.findById(id, organizationId);
      analysis.setError(error, userId);

      await this.aiAnalysisRepository.save(analysis);
    } catch (error) {
      this.logger.error(
        `Failed to set analysis error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to set analysis error');
    }
  }

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      this.logger.log(`Soft deleting AI analysis: ${id}`);

      const result = await this.aiAnalysisRepository.update(
        { id, organizationId },
        { deletedAt: new Date() },
      );

      if (result.affected === 0) {
        throw new NotFoundException(`AI analysis not found: ${id}`);
      }

      this.logger.log(`AI analysis soft deleted successfully: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to delete AI analysis: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete AI analysis');
    }
  }

  async getStats(
    organizationId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<AIAnalysisStats> {
    try {
      const baseQuery = this.aiAnalysisRepository
        .createQueryBuilder('analysis')
        .where('analysis.organizationId = :organizationId', { organizationId });

      if (dateRange) {
        baseQuery.andWhere(
          'analysis.createdAt BETWEEN :start AND :end',
          dateRange,
        );
      }

      // Get counts by status
      const statusCounts = await baseQuery
        .select('analysis.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('analysis.status')
        .getRawMany();

      // Get counts by type
      const typeCounts = await baseQuery
        .select('analysis.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('analysis.type')
        .getRawMany();

      // Get counts by confidence level
      const confidenceCounts = await baseQuery
        .select('analysis.confidenceLevel', 'confidenceLevel')
        .addSelect('COUNT(*)', 'count')
        .groupBy('analysis.confidenceLevel')
        .getRawMany();

      // Get averages and totals
      const averages = await baseQuery
        .select('AVG(analysis.processingTimeMs)', 'avgProcessingTime')
        .addSelect('SUM(analysis.totalCost)', 'totalCost')
        .addSelect('COUNT(*)', 'total')
        .getRawOne();

      // Calculate success and error rates
      const successCount =
        statusCounts.find((s) => s.status === AnalysisStatus.COMPLETED)
          ?.count || 0;
      const errorCount =
        statusCounts.find((s) => s.status === AnalysisStatus.FAILED)?.count ||
        0;
      const total = parseInt(averages.total) || 0;

      const successRate = total > 0 ? (successCount / total) * 100 : 0;
      const errorRate = total > 0 ? (errorCount / total) * 100 : 0;

      return {
        total,
        byStatus: this.buildStatusCounts(statusCounts),
        byType: this.buildTypeCounts(typeCounts),
        byConfidence: this.buildConfidenceCounts(confidenceCounts),
        averageProcessingTime: parseFloat(averages.avgProcessingTime) || 0,
        totalCost: parseFloat(averages.totalCost) || 0,
        successRate,
        errorRate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get analysis stats: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get analysis stats');
    }
  }

  async findSimilarAnalyses(
    organizationId: string,
    documentType: string,
    documentSize: number,
    limit: number = 5,
  ): Promise<AIAnalysis[]> {
    try {
      return await this.aiAnalysisRepository.find({
        where: {
          organizationId,
          documentType,
          status: AnalysisStatus.COMPLETED,
          documentSize: Between(documentSize * 0.8, documentSize * 1.2), // ±20% size range
        },
        order: { confidenceScore: 'DESC' },
        take: Math.min(limit, this.maxPageSize),
      });
    } catch (error) {
      this.logger.error(
        `Failed to find similar analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find similar analyses');
    }
  }

  async cleanupOldAnalyses(
    organizationId: string,
    daysOld: number = 90,
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.aiAnalysisRepository.update(
        {
          organizationId,
          createdAt: LessThan(cutoffDate),
          status: In([AnalysisStatus.COMPLETED, AnalysisStatus.FAILED]),
        },
        { deletedAt: new Date() },
      );

      this.logger.log(
        `Cleaned up ${result.affected} old analyses for organization: ${organizationId}`,
      );
      return result.affected || 0;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old analyses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to cleanup old analyses');
    }
  }

  // Private helper methods
  private buildSecureQuery(
    organizationId: string,
    filters: AIAnalysisFilters,
  ): SelectQueryBuilder<AIAnalysis> {
    const queryBuilder = this.aiAnalysisRepository
      .createQueryBuilder('analysis')
      .leftJoinAndSelect('analysis.organization', 'organization')
      .leftJoinAndSelect('analysis.user', 'user')
      .where('analysis.organizationId = :organizationId', { organizationId })
      .andWhere('analysis.deletedAt IS NULL');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('analysis.status = :status', {
        status: filters.status,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('analysis.type = :type', { type: filters.type });
    }

    if (filters.confidenceLevel) {
      queryBuilder.andWhere('analysis.confidenceLevel = :confidenceLevel', {
        confidenceLevel: filters.confidenceLevel,
      });
    }

    if (filters.dateRange) {
      queryBuilder.andWhere(
        'analysis.createdAt BETWEEN :start AND :end',
        filters.dateRange,
      );
    }

    if (filters.documentType) {
      queryBuilder.andWhere('analysis.documentType = :documentType', {
        documentType: filters.documentType,
      });
    }

    if (filters.minConfidence !== undefined) {
      queryBuilder.andWhere('analysis.confidenceScore >= :minConfidence', {
        minConfidence: filters.minConfidence,
      });
    }

    if (filters.maxCost !== undefined) {
      queryBuilder.andWhere('analysis.totalCost <= :maxCost', {
        maxCost: filters.maxCost,
      });
    }

    if (filters.hasErrors !== undefined) {
      if (filters.hasErrors) {
        queryBuilder.andWhere("analysis.metadata->>'errorDetails' IS NOT NULL");
      } else {
        queryBuilder.andWhere("analysis.metadata->>'errorDetails' IS NULL");
      }
    }

    return queryBuilder;
  }

  private applyPaginationAndSorting(
    queryBuilder: SelectQueryBuilder<AIAnalysis>,
    pagination: PaginationOptions,
    offset: number,
    limit: number,
  ): void {
    // Apply sorting
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'DESC';

    // Validate sort field to prevent SQL injection
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'status',
      'type',
      'confidenceScore',
      'totalCost',
    ];
    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`analysis.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('analysis.createdAt', 'DESC');
    }

    // Apply pagination
    queryBuilder.skip(offset).take(limit);
  }

  private buildStatusCounts(
    statusCounts: any[],
  ): Record<AnalysisStatus, number> {
    const counts: Record<AnalysisStatus, number> = {
      [AnalysisStatus.PENDING]: 0,
      [AnalysisStatus.PROCESSING]: 0,
      [AnalysisStatus.COMPLETED]: 0,
      [AnalysisStatus.FAILED]: 0,
      [AnalysisStatus.CANCELLED]: 0,
    };

    statusCounts.forEach((item) => {
      counts[item.status] = parseInt(item.count);
    });

    return counts;
  }

  private buildTypeCounts(typeCounts: any[]): Record<AnalysisType, number> {
    const counts: Record<AnalysisType, number> = {
      [AnalysisType.BRD_ANALYSIS]: 0,
      [AnalysisType.REQUIREMENT_EXTRACTION]: 0,
      [AnalysisType.RISK_ASSESSMENT]: 0,
      [AnalysisType.DEPENDENCY_MAPPING]: 0,
      [AnalysisType.COST_ESTIMATION]: 0,
      [AnalysisType.TIMELINE_ANALYSIS]: 0,
    };

    typeCounts.forEach((item) => {
      counts[item.type] = parseInt(item.count);
    });

    return counts;
  }

  private buildConfidenceCounts(
    confidenceCounts: any[],
  ): Record<ConfidenceLevel, number> {
    const counts: Record<ConfidenceLevel, number> = {
      [ConfidenceLevel.LOW]: 0,
      [ConfidenceLevel.MEDIUM]: 0,
      [ConfidenceLevel.HIGH]: 0,
      [ConfidenceLevel.VERY_HIGH]: 0,
    };

    confidenceCounts.forEach((item) => {
      if (item.confidenceLevel) {
        counts[item.confidenceLevel] = parseInt(item.count);
      }
    });

    return counts;
  }
}
