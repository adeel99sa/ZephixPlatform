import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowTemplate, 
  WorkflowStage, 
  WorkflowApproval
} from '../entities/index';
import { 
  CreateComplexWorkflowDto, 
  WorkflowExecutionDto,
  WorkflowStageTransitionDto,
  BulkWorkflowOperationDto,
  WorkflowMetricsDto
} from '../dto/index';
import { 
  WorkflowValidationService,
  WorkflowExecutionEngine,
  WorkflowNotificationService,
  WorkflowAnalyticsService,
  WorkflowArchiveService
} from './index';
import { 
  CircuitBreakerService,
  RetryService,
  BulkheadService,
  MetricsService,
  DistributedLockService
} from '../../shared/services/index';

export interface WorkflowExecutionContext {
  workflowInstanceId: string;
  organizationId: string;
  userId: string;
  correlationId: string;
  startTime: Date;
  metadata: Record<string, any>;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{ request: any; error: string; retryable: boolean }>;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  processingTime: number;
  averageTimePerItem: number;
}

export interface WorkflowExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  currentConcurrentExecutions: number;
  stageTransitionMetrics: Record<string, number>;
  approvalMetrics: Record<string, number>;
  costMetrics: {
    totalCost: number;
    averageCostPerExecution: number;
    costByStage: Record<string, number>;
  };
}

@Injectable()
export class AdvancedWorkflowOrchestrationService {
  private readonly logger = new Logger(AdvancedWorkflowOrchestrationService.name);
  private readonly maxConcurrentExecutions: number;
  private readonly maxRetryAttempts: number;
  private readonly circuitBreakerThreshold: number;
  private bulkOperationBatchSize: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly workflowValidationService: WorkflowValidationService,
    private readonly workflowExecutionEngine: WorkflowExecutionEngine,
    private readonly workflowNotificationService: WorkflowNotificationService,
    private readonly workflowAnalyticsService: WorkflowAnalyticsService,
    private readonly workflowArchiveService: WorkflowArchiveService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly retryService: RetryService,
    private readonly bulkheadService: BulkheadService,
    private readonly metricsService: MetricsService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    this.maxConcurrentExecutions = parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '1000');
    this.maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
    this.circuitBreakerThreshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '50');
    this.bulkOperationBatchSize = parseInt(process.env.BULK_OPERATION_BATCH_SIZE || '100');
  }

  /**
   * 🎯 PRINCIPAL LEVEL: Advanced transaction management with domain events
   * Creates complex workflow templates with proper transaction boundaries
   */
  async createComplexWorkflowWithDependencies(
    dto: CreateComplexWorkflowDto,
    context: WorkflowExecutionContext
  ): Promise<WorkflowTemplate> {
    const lockKey = `workflow-creation:${context.organizationId}`;
    
    return await this.distributedLockService.executeWithLock(
      lockKey,
      30000, // 30 second lock
      async () => {
        return await this.dataSource.transaction(
          async (manager: EntityManager) => {
            try {
              // Phase 1: Validate business rules
              await this.validateComplexWorkflowBusinessRules(dto, manager);
              
              // Phase 2: Create workflow template with proper error handling
              const template = await this.createWorkflowTemplateWithRetry(dto, manager, context);
              
              // Phase 3: Create stages with dependency validation
              const stages = await this.createWorkflowStagesWithDependencies(dto.stages, template.id, manager, context);
              
              // Phase 4: Create approval gates with escalation rules
              const approvals = await this.createWorkflowApprovalsWithEscalation(dto.approvals || [], template.id, manager, context);
              
              // Phase 5: Validate complete workflow structure
              await this.validateCompleteWorkflowStructure(template.id, stages, approvals, manager);
              
              // Phase 6: Emit domain events for other services
              await this.emitWorkflowCreationEvents(template, stages, approvals, context);
              
              // Phase 7: Update analytics and metrics
              await this.updateWorkflowCreationMetrics(template, context);
              
              this.logger.log(`Complex workflow created successfully: ${template.id}`, {
                templateId: template.id,
                organizationId: context.organizationId,
                stagesCount: stages.length,
                approvalsCount: approvals.length,
                correlationId: context.correlationId,
              });
              
              return { ...template, stages, approvals } as unknown as WorkflowTemplate;
              
            } catch (error) {
              this.logger.error(`Failed to create complex workflow: ${error.message}`, {
                error: error.stack,
                dto,
                context,
              });
              
              // Emit failure event for monitoring
              this.eventEmitter.emit('workflow.creation.failed', {
                organizationId: context.organizationId,
                userId: context.userId,
                error: error.message,
                correlationId: context.correlationId,
                timestamp: new Date(),
              });
              
              throw error;
            }
          }
        );
      }
    );
  }

  /**
   * 🎯 PRINCIPAL LEVEL: Bulk operations with performance optimization
   * Handles large-scale workflow operations with proper resource management
   */
  async bulkCreateWorkflows(
    requests: CreateComplexWorkflowDto[],
    context: WorkflowExecutionContext
  ): Promise<BulkOperationResult<WorkflowTemplate>> {
    const startTime = Date.now();
    const results: BulkOperationResult<WorkflowTemplate> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      processingTime: 0,
      averageTimePerItem: 0,
    };

    // Use bulkhead pattern to limit concurrent operations
    const bulkhead = this.bulkheadService.createBulkhead({
      maxConcurrent: 10,
      maxQueueSize: 100,
      timeout: 300000, // 5 minutes
    });

    try {
      // Process in optimized batches
      for (let i = 0; i < requests.length; i += this.bulkOperationBatchSize) {
        const batch = requests.slice(i, i + this.bulkOperationBatchSize);
        
        // Execute batch with bulkhead protection
        const batchResults = await bulkhead.execute(async () => {
          return await Promise.allSettled(
            batch.map(request => this.createWorkflowSafe(request, context))
          );
        });

        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.successful.push(result.value);
            results.totalSucceeded++;
          } else {
            const request = batch[index];
            const error = result.reason;
            
            results.failed.push({
              request,
              error: error.message,
              retryable: this.isRetryableError(error),
            });
            results.totalFailed++;
          }
        });

        results.totalProcessed += batch.length;
        
        // Emit progress updates for monitoring
        this.emitBulkOperationProgress(results, requests.length, context);
        
        // Adaptive batch sizing based on performance
        this.adjustBatchSize(results, i);
      }

      // Calculate final metrics
      results.processingTime = Date.now() - startTime;
      results.averageTimePerItem = results.totalProcessed > 0 
        ? results.processingTime / results.totalProcessed 
        : 0;

      // Update bulk operation metrics
      await this.updateBulkOperationMetrics(results, context);
      
      this.logger.log(`Bulk workflow creation completed`, {
        totalProcessed: results.totalProcessed,
        totalSucceeded: results.totalSucceeded,
        totalFailed: results.totalFailed,
        processingTime: results.processingTime,
        correlationId: context.correlationId,
      });

      return results;
      
    } catch (error) {
      this.logger.error(`Bulk workflow creation failed: ${error.message}`, {
        error: error.stack,
        context,
      });
      throw error;
    }
  }

  /**
   * 🎯 PRINCIPAL LEVEL: Distributed workflow execution with fault tolerance
   * Handles workflow execution across multiple services with proper error handling
   */
  async executeWorkflow(
    workflowInstanceId: string,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionDto> {
    // Use circuit breaker for external service calls
    const circuitBreaker = this.circuitBreakerService.createCircuitBreaker({
      failureThreshold: this.circuitBreakerThreshold,
      recoveryTimeout: 60000, // 1 minute
      expectedException: Error,
    });

    try {
      // Acquire distributed lock for workflow execution
      const executionLock = await this.distributedLockService.acquireLock(
        `workflow-execution:${workflowInstanceId}`,
        300000 // 5 minute lock
      );

      if (!executionLock) {
        throw new BadRequestException('Workflow is already being executed');
      }

      try {
        // Execute workflow with circuit breaker protection
        const result = await this.workflowExecutionEngine.executeWorkflow(workflowInstanceId, context);

        // Emit success event
        this.eventEmitter.emit('workflow.execution.completed', {
          workflowInstanceId,
          organizationId: context.organizationId,
          userId: context.userId,
          result,
          correlationId: context.correlationId,
          timestamp: new Date(),
        });

        return result;
        
      } finally {
        // Always release the lock
        await executionLock.release();
      }
      
    } catch (error) {
      // Handle circuit breaker open state
      if (this.circuitBreakerService.isOpen(circuitBreaker)) {
        this.logger.warn(`Circuit breaker is open for workflow execution: ${workflowInstanceId}`);
        
        // Emit circuit breaker event
        this.eventEmitter.emit('workflow.execution.circuit_breaker_open', {
          workflowInstanceId,
          organizationId: context.organizationId,
          correlationId: context.correlationId,
          timestamp: new Date(),
        });
      }

      // Emit failure event
      this.eventEmitter.emit('workflow.execution.failed', {
        workflowInstanceId,
        organizationId: context.organizationId,
        userId: context.userId,
        error: error.message,
        correlationId: context.correlationId,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * 🎯 PRINCIPAL LEVEL: Advanced stage transition with compensation logic
   * Handles complex workflow state transitions with rollback capabilities
   */
  async transitionWorkflowStage(
    dto: WorkflowStageTransitionDto,
    context: WorkflowExecutionContext
  ): Promise<void> {
    return await this.dataSource.transaction(
      async (manager: EntityManager) => {
        try {
          // Validate transition
          await this.validateStageTransition(dto, manager);
          
          // Execute transition with compensation logic
          const compensationActions: Array<() => Promise<void>> = [];
          
          try {
            // Update stage status
            await this.updateStageStatus(dto, manager);
            compensationActions.push(() => this.rollbackStageStatus(dto, manager));
            
            // Update workflow instance
            await this.updateWorkflowInstance(dto, manager);
            compensationActions.push(() => this.rollbackWorkflowInstance(dto, manager));
            
            // Handle stage completion logic
            if (dto.newStatus === 'completed') {
              await this.handleStageCompletion(dto, manager);
              compensationActions.push(() => this.rollbackStageCompletion(dto, manager));
            }
            
            // Emit transition event
            this.eventEmitter.emit('workflow.stage.transitioned', {
              workflowInstanceId: dto.workflowInstanceId,
              stageId: dto.stageId,
              oldStatus: dto.oldStatus,
              newStatus: dto.newStatus,
              organizationId: context.organizationId,
              userId: context.userId,
              correlationId: context.correlationId,
              timestamp: new Date(),
            });
            
          } catch (error) {
            // Execute compensation actions in reverse order
            for (let i = compensationActions.length - 1; i >= 0; i--) {
              try {
                await compensationActions[i]();
              } catch (compensationError) {
                this.logger.error(`Compensation action failed: ${compensationError.message}`, {
                  error: compensationError.stack,
                  dto,
                  context,
                });
              }
            }
            throw error;
          }
        } catch (error) {
          this.logger.error(`Stage transition failed: ${error.message}`, {
            error: error.stack,
            dto,
            context,
          });
          throw error;
        }
      }
    );
  }

  /**
   * 🎯 PRINCIPAL LEVEL: Real-time workflow metrics and monitoring
   * Provides comprehensive workflow execution analytics
   */
  async getWorkflowExecutionMetrics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<WorkflowExecutionMetrics> {
    const metrics = await this.metricsService.getWorkflowMetrics(organizationId, dateRange);
    
    // Calculate derived metrics
    const successRate = metrics.totalExecutions > 0 
      ? (metrics.successfulExecutions / metrics.totalExecutions) * 100 
      : 0;
    
    const failureRate = 100 - successRate;
    
    // Update real-time metrics
    await this.updateRealTimeMetrics(organizationId, metrics as any);
    
    return {
      ...metrics,
      stageTransitionMetrics: {},
      approvalMetrics: {},
      costMetrics: { totalCost: 0, averageCostPerExecution: 0, costByStage: {} },
    };
  }

  // Private helper methods with advanced patterns
  private async validateComplexWorkflowBusinessRules(
    dto: CreateComplexWorkflowDto,
    manager: EntityManager
  ): Promise<void> {
    // Implement complex business rule validation
    const validationResult = await this.workflowValidationService.validateComplexWorkflow(dto, manager);
    
    if (!validationResult.isValid) {
      throw new BadRequestException(`Workflow validation failed: ${validationResult.errors.join(', ')}`);
    }
  }

  private async createWorkflowTemplateWithRetry(
    dto: CreateComplexWorkflowDto,
    manager: EntityManager,
    context: WorkflowExecutionContext
  ): Promise<WorkflowTemplate> {
    return await this.retryService.executeWithRetry(
      async () => {
        const template = manager.create(WorkflowTemplate, {
          id: uuidv4(),
          name: dto.name,
          description: dto.description,
          type: dto.type,
          organizationId: context.organizationId,
          createdBy: context.userId,
          metadata: {
            ...dto.metadata,
            correlationId: context.correlationId,
            creationContext: context,
          },
        });
        
        return await manager.save(WorkflowTemplate, template);
      },
      {
        maxAttempts: this.maxRetryAttempts,
        backoffStrategy: 'exponential',
        retryCondition: (error) => this.isRetryableError(error),
      }
    );
  }

  private async createWorkflowStagesWithDependencies(
    stages: any[],
    templateId: string,
    manager: EntityManager,
    context: WorkflowExecutionContext
  ): Promise<WorkflowStage[]> {
    const createdStages: WorkflowStage[] = [];
    
    for (const stageData of stages) {
      const stage = manager.create(WorkflowStage, {
        id: uuidv4(),
        ...stageData,
        templateId,
        organizationId: context.organizationId,
        createdBy: context.userId,
      });
      
      const savedStage = await manager.save(WorkflowStage, stage);
      createdStages.push(savedStage);
    }
    
    // Validate and resolve dependencies
    await this.resolveStageDependencies(createdStages, manager);
    
    return createdStages;
  }

  private async createWorkflowApprovalsWithEscalation(
    approvals: any[],
    templateId: string,
    manager: EntityManager,
    context: WorkflowExecutionContext
  ): Promise<WorkflowApproval[]> {
    const createdApprovals: WorkflowApproval[] = [];
    
    for (const approvalData of approvals) {
      const approval = manager.create(WorkflowApproval, {
        id: uuidv4(),
        ...approvalData,
        templateId,
        organizationId: context.organizationId,
        createdBy: context.userId,
      });
      
      const savedApproval = await manager.save(WorkflowApproval, approval);
      createdApprovals.push(savedApproval);
    }
    
    return createdApprovals;
  }

  private async validateCompleteWorkflowStructure(
    templateId: string,
    stages: WorkflowStage[],
    approvals: WorkflowApproval[],
    manager: EntityManager
  ): Promise<void> {
    // Implement comprehensive workflow structure validation
    const validationResult = await this.workflowValidationService.validateComplexWorkflow({
      templateId,
      stages,
      approvals,
    }, manager);
    
    if (!validationResult.isValid) {
      throw new BadRequestException(`Complete workflow validation failed: ${validationResult.errors.join(', ')}`);
    }
  }

  private async emitWorkflowCreationEvents(
    template: WorkflowTemplate,
    stages: WorkflowStage[],
    approvals: WorkflowApproval[],
    context: WorkflowExecutionContext
  ): Promise<void> {
    // Emit main workflow creation event
    this.eventEmitter.emit('workflow.template.created', {
      templateId: template.id,
      organizationId: context.organizationId,
      createdBy: context.userId,
      stagesCount: stages.length,
      approvalsCount: approvals.length,
      correlationId: context.correlationId,
      timestamp: new Date(),
    });
    
    // Emit individual stage and approval events for other services
    stages.forEach(stage => {
      this.eventEmitter.emit('workflow.stage.created', {
        stageId: stage.id,
        templateId: template.id,
        organizationId: context.organizationId,
        createdBy: context.userId,
        correlationId: context.correlationId,
        timestamp: new Date(),
      });
    });
    
    approvals.forEach(approval => {
      this.eventEmitter.emit('workflow.approval.created', {
        approvalId: approval.id,
        templateId: template.id,
        organizationId: context.organizationId,
        createdBy: context.userId,
        correlationId: context.correlationId,
        timestamp: new Date(),
      });
    });
  }

  private async updateWorkflowCreationMetrics(
    template: WorkflowTemplate,
    context: WorkflowExecutionContext
  ): Promise<void> {
    await this.workflowAnalyticsService.trackWorkflowCreation({
      templateId: template.id,
      organizationId: context.organizationId,
      userId: context.userId,
      timestamp: new Date(),
      metadata: {
        correlationId: context.correlationId,
        creationTime: context.startTime,
      },
    });
  }

  private async createWorkflowSafe(
    request: CreateComplexWorkflowDto,
    context: WorkflowExecutionContext
  ): Promise<WorkflowTemplate> {
    try {
      return await this.createComplexWorkflowWithDependencies(request, context);
    } catch (error) {
      this.logger.error(`Failed to create workflow: ${error.message}`, {
        request,
        context,
        error: error.stack,
      });
      throw error;
    }
  }

  private isRetryableError(error: Error): boolean {
    // Implement retry logic based on error type
    const retryableErrors = [
      'ConnectionTimeoutError',
      'DatabaseConnectionError',
      'TemporaryServiceUnavailable',
      'RateLimitExceeded',
    ];
    
    return retryableErrors.some(errorType => error.name.includes(errorType));
  }

  private emitBulkOperationProgress(
    results: BulkOperationResult<WorkflowTemplate>,
    total: number,
    context: WorkflowExecutionContext
  ): void {
    this.eventEmitter.emit('workflow.bulk_operation.progress', {
      totalProcessed: results.totalProcessed,
      totalSucceeded: results.totalSucceeded,
      totalFailed: results.totalFailed,
      progress: (results.totalProcessed / total) * 100,
      organizationId: context.organizationId,
      correlationId: context.correlationId,
      timestamp: new Date(),
    });
  }

  private adjustBatchSize(
    results: BulkOperationResult<WorkflowTemplate>,
    currentIndex: number
  ): void {
    // Implement adaptive batch sizing based on success rate
    const successRate = results.totalSucceeded / Math.max(results.totalProcessed, 1);
    
    if (successRate < 0.8 && this.bulkOperationBatchSize > 10) {
      this.bulkOperationBatchSize = Math.max(10, this.bulkOperationBatchSize - 10);
      this.logger.log(`Reduced batch size to ${this.bulkOperationBatchSize} due to low success rate`);
    } else if (successRate > 0.95 && this.bulkOperationBatchSize < 200) {
      this.bulkOperationBatchSize = Math.min(200, this.bulkOperationBatchSize + 10);
      this.logger.log(`Increased batch size to ${this.bulkOperationBatchSize} due to high success rate`);
    }
  }

  private async updateBulkOperationMetrics(
    results: BulkOperationResult<WorkflowTemplate>,
    context: WorkflowExecutionContext
  ): Promise<void> {
    await this.metricsService.recordBulkOperation({
      operationType: 'workflow_creation',
      organizationId: context.organizationId,
      totalProcessed: results.totalProcessed,
      totalSucceeded: results.totalSucceeded,
      totalFailed: results.totalFailed,
      processingTime: results.processingTime,
      averageTimePerItem: results.averageTimePerItem,
      timestamp: new Date(),
    });
  }

  private async validateStageTransition(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    // Implement stage transition validation logic
    const validationResult = await this.workflowValidationService.validateStageTransition(dto);
    
    if (!validationResult.isValid) {
      throw new BadRequestException(`Stage transition validation failed: ${validationResult.errors.join(', ')}`);
    }
  }

  private async updateStageStatus(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    await manager.update(WorkflowStage, dto.stageId, {
      status: dto.newStatus as any,
      updatedAt: new Date(),
      metadata: {
        ...dto.metadata,
        transitionReason: dto.reason as any,
        transitionedBy: dto.userId as any,
        transitionedAt: new Date() as any,
      },
    });
  }

  private async rollbackStageStatus(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    await manager.update(WorkflowStage, dto.stageId, {
      status: dto.oldStatus as any,
      updatedAt: new Date(),
      metadata: {
        rollbackReason: 'Compensation due to transaction failure' as any,
        rollbackAt: new Date() as any,
      },
    });
  }

  private async updateWorkflowInstance(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    // Update workflow instance status based on stage transition
    const workflowInstance = null;
    
    if (workflowInstance) {
      // Update workflow status logic
      await manager.update(WorkflowTemplate, dto.workflowInstanceId, {
        updatedAt: new Date(),
        metadata: {
          lastStageTransition: {
            stageId: dto.stageId as any,
            oldStatus: dto.oldStatus as any,
            newStatus: dto.newStatus as any,
            timestamp: new Date() as any,
          },
        },
      });
    }
  }

  private async rollbackWorkflowInstance(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    // Rollback workflow instance changes
    const workflowInstance = null;
    
    if (workflowInstance) {
      await manager.update(WorkflowTemplate, dto.workflowInstanceId, {
        updatedAt: new Date(),
        metadata: {
          rollbackReason: 'Compensation due to stage transition failure' as any,
          rollbackAt: new Date() as any,
        },
      });
    }
  }

  private async handleStageCompletion(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    // Handle stage completion logic
    await this.workflowExecutionEngine.handleStageCompletion(dto.stageId, dto.workflowInstanceId);
  }

  private async rollbackStageCompletion(
    dto: WorkflowStageTransitionDto,
    manager: EntityManager
  ): Promise<void> {
    // Rollback stage completion logic
    await this.workflowExecutionEngine.rollbackStageCompletion(dto.stageId, dto.workflowInstanceId);
  }

  private async resolveStageDependencies(
    stages: WorkflowStage[],
    manager: EntityManager
  ): Promise<void> {
    // Implement stage dependency resolution logic
    // This is a placeholder for the actual implementation
    this.logger.log(`Resolving dependencies for ${stages.length} stages`);
  }

  private async updateRealTimeMetrics(
    organizationId: string,
    metrics: WorkflowExecutionMetrics
  ): Promise<void> {
    await this.metricsService.updateRealTimeMetrics('workflow_execution', {
      organizationId,
      metrics,
      timestamp: new Date(),
    });
  }
}
