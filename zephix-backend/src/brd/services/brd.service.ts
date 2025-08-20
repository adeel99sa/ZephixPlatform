import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { trace } from '@opentelemetry/api';
import { MetricsService } from '../../observability/metrics.service';
import {
  BRDRepository,
  BRDListOptions,
  BRDListResult,
} from '../repositories/brd.repository';
import { BRD, BRDStatus } from '../entities/brd.entity';
import { CreateBRDDto, UpdateBRDDto } from '../dto';

@Injectable()
export class BRDService {
  private readonly tracer = trace.getTracer('brd-service');

  constructor(
    private readonly brdRepository: BRDRepository,
    private readonly logger: PinoLogger,
    private readonly metricsService: MetricsService,
  ) {
    this.logger.setContext(BRDService.name);
  }

  /**
   * Create a new BRD
   */
  async create(createBRDDto: CreateBRDDto): Promise<BRD> {
    return this.tracer.startActiveSpan('brd.create', async (span) => {
      try {
        this.logger.info(
          {
            organizationId: createBRDDto.organizationId,
            project_id: createBRDDto.project_id,
            title: createBRDDto.payload?.metadata?.title,
          },
          'Creating new BRD',
        );

        // Add span attributes
        span.setAttributes({
          'brd.organizationId': createBRDDto.organizationId,
          'brd.project_id': createBRDDto.project_id || '',
          'brd.title': createBRDDto.payload?.metadata?.title || '',
        });

        // Validate payload structure
        this.validatePayload(createBRDDto.payload);

        const brd = await this.brdRepository.create(
          {
            organizationId: createBRDDto.organizationId,
            project_id: createBRDDto.project_id,
            payload: createBRDDto.payload,
            status: BRDStatus.DRAFT,
            version: 1,
          },
          createBRDDto.organizationId,
        );

        // Update search vector
        await this.brdRepository.updateSearchVector(brd.id, brd.organizationId);

        // Record metrics
        this.metricsService.recordBRDOperation(
          'create',
          'success',
          createBRDDto.organizationId,
        );

        this.logger.info(
          {
            brd_id: brd.id,
            organizationId: brd.organizationId,
            title: brd.getTitle(),
          },
          'BRD created successfully',
        );

        span.setStatus({ code: 1 }); // OK
        return brd;
      } catch (error) {
        this.logger.error(
          {
            error: error.message,
            organizationId: createBRDDto.organizationId,
          },
          'Failed to create BRD',
        );

        this.metricsService.recordBRDOperation(
          'create',
          'error',
          createBRDDto.organizationId,
        );
        this.metricsService.recordError(
          'brd_creation_failed',
          'brd-service',
          createBRDDto.organizationId,
        );

        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get BRD by ID
   */
  async findById(id: string, organizationId: string): Promise<BRD> {
    const brd = await this.brdRepository.findById(id, organizationId);
    if (!brd) {
      throw new NotFoundException(`BRD with ID ${id} not found`);
    }
    return brd;
  }

  /**
   * Update BRD
   */
  async update(
    id: string,
    organizationId: string,
    updateBRDDto: UpdateBRDDto,
  ): Promise<BRD> {
    const brd = await this.findById(id, organizationId);

    // Check if BRD can be edited
    if (brd.status !== BRDStatus.DRAFT && brd.status !== BRDStatus.IN_REVIEW) {
      throw new ForbiddenException('Cannot edit BRD in current status');
    }

    // Validate payload structure
    this.validatePayload(updateBRDDto.payload);

    const updatedBRD = await this.brdRepository.update(id, organizationId, {
      payload: updateBRDDto.payload,
    });

    if (!updatedBRD) {
      throw new NotFoundException(`BRD with ID ${id} not found`);
    }

    // Update search vector
    await this.brdRepository.updateSearchVector(
      updatedBRD.id,
      updatedBRD.organizationId,
    );

    return updatedBRD;
  }

  /**
   * List BRDs with filtering and pagination
   */
  async findMany(options: BRDListOptions): Promise<BRDListResult> {
    return this.brdRepository.findMany(options);
  }

  /**
   * Delete BRD
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const brd = await this.findById(id, organizationId);

    // Only allow deletion of draft BRDs
    if (brd.status !== BRDStatus.DRAFT) {
      throw new ForbiddenException('Can only delete draft BRDs');
    }

    const deleted = await this.brdRepository.delete(id, organizationId);
    if (!deleted) {
      throw new NotFoundException(`BRD with ID ${id} not found`);
    }
  }

  /**
   * Change BRD status (workflow management)
   */
  async changeStatus(
    id: string,
    organizationId: string,
    newStatus: BRDStatus,
  ): Promise<BRD> {
    return this.tracer.startActiveSpan('brd.changeStatus', async (span) => {
      try {
        // Get current BRD to track status transition
        const currentBRD = await this.findById(id, organizationId);
        const oldStatus = currentBRD.status;

        this.logger.info(
          {
            brd_id: id,
            organizationId,
            old_status: oldStatus,
            new_status: newStatus,
          },
          'Changing BRD status',
        );

        span.setAttributes({
          'brd.id': id,
          'brd.organizationId': organizationId,
          'brd.old_status': oldStatus,
          'brd.new_status': newStatus,
        });

        const brd = await this.brdRepository.changeStatus(
          id,
          organizationId,
          newStatus,
        );
        if (!brd) {
          throw new NotFoundException(`BRD with ID ${id} not found`);
        }

        // Record status transition metrics
        this.metricsService.recordBRDStatusTransition(
          oldStatus,
          newStatus,
          organizationId,
        );

        this.logger.info(
          {
            brd_id: id,
            organizationId,
            status_transition: `${oldStatus} -> ${newStatus}`,
          },
          'BRD status changed successfully',
        );

        span.setStatus({ code: 1 }); // OK
        return brd;
      } catch (error) {
        this.logger.error(
          {
            error: error.message,
            brd_id: id,
            organizationId,
            new_status: newStatus,
          },
          'Failed to change BRD status',
        );

        this.metricsService.recordError(
          'brd_status_change_failed',
          'brd-service',
          organizationId,
        );

        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Submit BRD for review
   */
  async submitForReview(id: string, organizationId: string): Promise<BRD> {
    const brd = await this.findById(id, organizationId);

    // Validate BRD is complete before submission
    if (!brd.isComplete()) {
      throw new BadRequestException(
        'BRD must be complete before submission for review',
      );
    }

    return this.changeStatus(id, organizationId, BRDStatus.IN_REVIEW);
  }

  /**
   * Approve BRD
   */
  async approve(id: string, organizationId: string): Promise<BRD> {
    return this.changeStatus(id, organizationId, BRDStatus.APPROVED);
  }

  /**
   * Publish BRD
   */
  async publish(id: string, organizationId: string): Promise<BRD> {
    return this.changeStatus(id, organizationId, BRDStatus.PUBLISHED);
  }

  /**
   * Publish BRD alias for tests (3 arguments)
   */
  async publishBRD(
    id: string,
    organizationId: string,
    dto?: any,
  ): Promise<BRD> {
    return this.publish(id, organizationId);
  }

  /**
   * Get BRD statistics
   */
  async getStatistics(organizationId: string) {
    return this.brdRepository.getStatistics(organizationId);
  }

  /**
   * Search BRDs
   */
  async search(
    organizationId: string,
    query: string,
    limit = 10,
  ): Promise<BRD[]> {
    return this.tracer.startActiveSpan('brd.search', async (span) => {
      const startTime = Date.now();

      try {
        this.logger.info(
          {
            organizationId,
            query,
            limit,
          },
          'Searching BRDs',
        );

        span.setAttributes({
          'brd.organizationId': organizationId,
          'search.query': query,
          'search.limit': limit,
        });

        const results = await this.brdRepository.search(
          organizationId,
          query,
          limit,
        );

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.recordSearchQuery(
          'fulltext',
          duration,
          organizationId,
        );
        this.metricsService.recordBRDOperation(
          'search',
          'success',
          organizationId,
        );

        this.logger.info(
          {
            organizationId,
            query,
            results_count: results.length,
            duration_ms: Date.now() - startTime,
          },
          'BRD search completed',
        );

        span.setAttributes({
          'search.results_count': results.length,
          'search.duration_ms': Date.now() - startTime,
        });
        span.setStatus({ code: 1 }); // OK

        return results;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.recordSearchQuery(
          'fulltext',
          duration,
          organizationId,
        );
        this.metricsService.recordBRDOperation(
          'search',
          'error',
          organizationId,
        );
        this.metricsService.recordError(
          'brd_search_failed',
          'brd-service',
          organizationId,
        );

        this.logger.error(
          {
            error: error.message,
            organizationId,
            query,
          },
          'BRD search failed',
        );

        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get BRDs by project
   */
  async findByProject(
    project_id: string,
    organizationId: string,
  ): Promise<BRD[]> {
    return this.brdRepository.findByProject(project_id, organizationId);
  }

  /**
   * Validate BRD payload structure
   */
  private validatePayload(payload: Record<string, any>): void {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Payload must be a valid object');
    }

    // Basic structure validation
    if (!payload.metadata) {
      throw new BadRequestException('Payload must contain metadata section');
    }

    if (!payload.metadata.title) {
      throw new BadRequestException('Metadata must contain a title');
    }

    if (!payload.businessContext) {
      throw new BadRequestException(
        'Payload must contain businessContext section',
      );
    }

    // Validate title length
    if (payload.metadata.title.length > 255) {
      throw new BadRequestException('Title cannot exceed 255 characters');
    }

    // Validate required business context fields
    const businessContext = payload.businessContext;
    if (
      businessContext.problemStatement &&
      businessContext.problemStatement.length > 2000
    ) {
      throw new BadRequestException(
        'Problem statement cannot exceed 2000 characters',
      );
    }

    if (
      businessContext.businessObjective &&
      businessContext.businessObjective.length > 2000
    ) {
      throw new BadRequestException(
        'Business objective cannot exceed 2000 characters',
      );
    }

    // Validate functional requirements if present
    if (
      payload.functionalRequirements &&
      !Array.isArray(payload.functionalRequirements)
    ) {
      throw new BadRequestException('Functional requirements must be an array');
    }

    // Additional validation can be added here for specific payload structures
  }

  /**
   * Validate sort field for security
   */
  private validateSortField(sort: string): string {
    const allowedFields = ['created_at', 'updated_at', 'version', 'status'];
    if (!allowedFields.includes(sort)) {
      throw new BadRequestException(`Invalid sort field: ${sort}`);
    }
    return sort;
  }

  /**
   * Convert BRD entity to response format
   */
  private mapToResponse(brd: BRD) {
    return {
      id: brd.id,
      organizationId: brd.organizationId,
      project_id: brd.project_id,
      version: brd.version,
      status: brd.status,
      payload: brd.payload,
      created_at: brd.created_at,
      updated_at: brd.updated_at,
      // Extracted helper properties
      title: brd.getTitle(),
      summary: brd.getSummary(),
      industry: brd.getIndustry(),
      department: brd.getDepartment(),
    };
  }

  /**
   * Bulk operations for admin
   */
  async bulkUpdateStatus(
    ids: string[],
    organizationId: string,
    newStatus: BRDStatus,
  ): Promise<{ updated: number }> {
    const updated = await this.brdRepository.bulkUpdateStatus(
      ids,
      organizationId,
      newStatus,
    );
    return { updated };
  }

  /**
   * Duplicate BRD
   */
  async duplicate(
    id: string,
    organizationId: string,
    newTitle?: string,
  ): Promise<BRD> {
    const originalBRD = await this.findById(id, organizationId);

    // Create a copy of the payload with updated metadata
    const newPayload = {
      ...originalBRD.payload,
      metadata: {
        ...originalBRD.payload.metadata,
        title: newTitle || `Copy of ${originalBRD.getTitle()}`,
        version: '1.0.0', // Reset version for copy
      },
    };

    return this.create({
      organizationId,
      project_id: originalBRD.project_id || undefined,
      payload: newPayload,
    });
  }

  /**
   * Get BRD validation summary
   */
  async getValidationSummary(id: string, organizationId: string) {
    const brd = await this.findById(id, organizationId);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!brd.getTitle()) {
      errors.push('Title is required');
    }

    if (!brd.payload.businessContext?.problemStatement) {
      errors.push('Problem statement is required');
    }

    if (!brd.payload.businessContext?.businessObjective) {
      errors.push('Business objective is required');
    }

    // Warnings
    if (!brd.getSummary()) {
      warnings.push('Summary is recommended');
    }

    if (!brd.payload.functionalRequirements?.length) {
      warnings.push('At least one functional requirement is recommended');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: brd.getCompletionPercentage(),
    };
  }
}
