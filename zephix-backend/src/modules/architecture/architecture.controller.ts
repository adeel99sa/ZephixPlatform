import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArchitectureDerivationService } from './architecture-derivation.service';
import {
  DeriveArchitectureDto,
  ArchitectureReviewDto,
  ArchitectureDerivationResponseDto,
  ArchitectureBundleResponseDto,
} from './dto/architecture-derivation.dto';
import { MetricsService } from '../../observability/metrics.service';
import { LoggerService } from '../../observability/logger.service';
import pino from 'pino';
import { TelemetryService } from '../../observability/telemetry.service';

@ApiTags('Architecture Derivation')
@Controller('architecture')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ArchitectureController {
  private readonly logger: pino.Logger;

  constructor(
    private architectureService: ArchitectureDerivationService,
    private metricsService: MetricsService,
    private loggerService: LoggerService,
    private telemetryService: TelemetryService,
  ) {
    this.logger = this.loggerService.createServiceLogger(
      'ArchitectureController',
    );
  }

  @Post('derive')
  @ApiOperation({
    summary: 'Derive architecture from BRD',
    description:
      'Analyze a Business Requirements Document and generate comprehensive architecture artifacts including drivers, constraints, options, C4 diagrams, ADRs, and threat model.',
  })
  @ApiResponse({
    status: 201,
    description: 'Architecture successfully derived',
    type: ArchitectureDerivationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid BRD data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Architecture derivation failed' })
  async deriveArchitecture(
    @Body() deriveDto: DeriveArchitectureDto,
    @Request() req,
    @Res() res: Response,
  ) {
    const requestId = req.requestId || 'unknown';
    const logger = this.loggerService.createRequestLogger(requestId, {
      operation: 'derive-architecture',
      brdId: deriveDto.id,
      userId: req.user?.id,
    });

    return this.telemetryService.traceFunction(
      'architecture-derivation',
      async () => {
        logger.info('Starting architecture derivation');

        try {
          // Validate tenant access (ensure user can access this BRD)
          // Note: In a real implementation, you'd verify the BRD belongs to the user's tenant
          this.telemetryService.addSpanAttributes({
            'brd.id': deriveDto.id,
            'brd.requirements_count': deriveDto.functional_requirements.length,
            'user.id': req.user?.id,
          });

          const startTime = Date.now();
          const derivation =
            await this.architectureService.deriveArchitecture(deriveDto);
          const duration = Date.now() - startTime;

          // Record metrics
          this.metricsService.incrementLlmRequests(
            'anthropic',
            'claude-3-sonnet',
            'success',
          );

          logger.info('Architecture derivation completed');

          // Return response with 202 status for async processing
          res.status(HttpStatus.CREATED).json({
            id: 'generated-id', // Would be actual UUID from database
            status: 'completed',
            message: 'Architecture derivation completed successfully',
            ...derivation,
          });
        } catch (error) {
          this.metricsService.incrementError(
            'architecture_derivation',
            'architecture-controller',
          );
          this.telemetryService.recordException(error);

          logger.error(error, 'Architecture derivation failed');

          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Architecture derivation failed',
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
          });
        }
      },
      {
        'operation.name': 'derive-architecture',
        'brd.id': deriveDto.id,
      },
    );
  }

  @Get(':id/bundle')
  @ApiOperation({
    summary: 'Get architecture bundle',
    description:
      'Retrieve the complete architecture bundle including summary, diagrams, ADRs, and risk analysis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Architecture bundle retrieved successfully',
    type: ArchitectureBundleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Architecture derivation not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getArchitectureBundle(
    @Param('id', ParseUUIDPipe) derivationId: string,
    @Request() req,
  ) {
    const requestId = req.requestId || 'unknown';
    const logger = this.loggerService.createRequestLogger(requestId, {
      operation: 'get-architecture-bundle',
      derivationId,
      userId: req.user?.id,
    });

    return this.telemetryService.traceFunction(
      'get-architecture-bundle',
      async () => {
        logger.info('Retrieving architecture bundle');

        try {
          // In real implementation, retrieve derivation from database
          // For now, return mock response
          const mockDerivation = {
            analysis_metadata: {
              brd_id: 'mock-brd-id',
              generated_at: new Date().toISOString(),
              version: '1.0',
              analyst: 'Zephix AI Architecture Service',
            },
            key_drivers: [],
            constraints: [],
            architecture_options: [],
            selected_option: {
              option: 'A',
              rationale: 'Mock',
              decision_criteria: [],
            },
            c4_diagrams: { context: '', container: '', component: '' },
            adrs: [],
            threat_model: [],
            open_questions: [],
          } as any;

          const bundle =
            await this.architectureService.generateArchitectureBundle(
              mockDerivation,
            );

          logger.info('Architecture bundle retrieved successfully');

          return bundle;
        } catch (error) {
          this.metricsService.incrementError(
            'architecture_bundle_retrieval',
            'architecture-controller',
          );
          this.telemetryService.recordException(error);

          logger.error(error, 'Failed to retrieve architecture bundle');

          throw error;
        }
      },
      {
        'operation.name': 'get-architecture-bundle',
        'derivation.id': derivationId,
      },
    );
  }

  @Post(':id/review')
  @ApiOperation({
    summary: 'Review architecture derivation',
    description:
      'Submit a review for an architecture derivation (approve, request changes, or reject).',
  })
  @ApiResponse({ status: 200, description: 'Review submitted successfully' })
  @ApiResponse({
    status: 404,
    description: 'Architecture derivation not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async reviewArchitecture(
    @Param('id', ParseUUIDPipe) derivationId: string,
    @Body() reviewDto: ArchitectureReviewDto,
    @Request() req,
  ) {
    const requestId = req.requestId || 'unknown';
    const logger = this.loggerService.createRequestLogger(requestId, {
      operation: 'review-architecture',
      derivationId,
      decision: reviewDto.decision,
      userId: req.user?.id,
    });

    return this.telemetryService.traceFunction(
      'review-architecture',
      async () => {
        logger.info('Processing architecture review');

        try {
          // Validate derivation ID matches request
          if (reviewDto.derivation_id !== derivationId) {
            logger.warn('Derivation ID mismatch in review');
            throw new Error('Derivation ID mismatch');
          }

          // In real implementation:
          // 1. Verify user has review permissions
          // 2. Update derivation status in database
          // 3. Send notifications to stakeholders
          // 4. If approved, mark as ready for publishing

          const reviewResult = {
            id: derivationId,
            status:
              reviewDto.decision === 'approve'
                ? 'approved'
                : reviewDto.decision === 'request_changes'
                  ? 'changes_requested'
                  : 'rejected',
            reviewed_by: req.user?.id,
            reviewed_at: new Date().toISOString(),
            comments: reviewDto.comments,
            requested_changes: reviewDto.requested_changes,
          };

          logger.info('Architecture review processed successfully');

          // Record metrics
          this.metricsService.incrementLlmRequests(
            'anthropic',
            'claude-3-sonnet',
            'success',
          );

          return {
            message: 'Review submitted successfully',
            ...reviewResult,
          };
        } catch (error) {
          this.metricsService.incrementError(
            'architecture_review',
            'architecture-controller',
          );
          this.telemetryService.recordException(error);

          logger.error(error, 'Architecture review failed');

          throw error;
        }
      },
      {
        'operation.name': 'review-architecture',
        'derivation.id': derivationId,
        'review.decision': reviewDto.decision,
      },
    );
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish approved architecture',
    description:
      'Publish an approved architecture derivation, making it available for project creation and export.',
  })
  @ApiResponse({
    status: 200,
    description: 'Architecture published successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Architecture derivation not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Architecture not approved for publishing',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async publishArchitecture(
    @Param('id', ParseUUIDPipe) derivationId: string,
    @Request() req,
  ) {
    const requestId = req.requestId || 'unknown';
    const logger = this.loggerService.createRequestLogger(requestId, {
      operation: 'publish-architecture',
      derivationId,
      userId: req.user?.id,
    });

    return this.telemetryService.traceFunction(
      'publish-architecture',
      async () => {
        logger.info('Publishing architecture');

        try {
          // In real implementation:
          // 1. Verify architecture is approved
          // 2. Run final validation checks
          // 3. Update status to published
          // 4. Generate final export artifacts
          // 5. Send notifications

          const publishResult = {
            id: derivationId,
            status: 'published',
            published_by: req.user?.id,
            published_at: new Date().toISOString(),
            artifacts: {
              summary_url: `/api/architecture/${derivationId}/bundle`,
              diagrams_count: 3,
              adrs_count: 5,
              threats_count: 8,
            },
          };

          logger.info('Architecture published successfully');

          return {
            message: 'Architecture published successfully',
            ...publishResult,
          };
        } catch (error) {
          this.metricsService.incrementError(
            'architecture_publish',
            'architecture-controller',
          );
          this.telemetryService.recordException(error);

          logger.error(error, 'Architecture publishing failed');

          throw error;
        }
      },
      {
        'operation.name': 'publish-architecture',
        'derivation.id': derivationId,
      },
    );
  }
}
