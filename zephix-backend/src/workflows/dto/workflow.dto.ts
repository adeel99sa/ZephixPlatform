import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsNumber, IsDate, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { 
  WorkflowType,
  WorkflowStatus,
  StageType,
  StageStatus,
  ApprovalType,
  ApprovalStatus,
  ApprovalLevel
} from '../entities';

// Re-export enums for use in controllers
export { WorkflowType, WorkflowStatus, StageType, StageStatus, ApprovalType, ApprovalStatus, ApprovalLevel };

// Base DTOs
export class WorkflowTemplateDto {
  @ApiProperty({ description: 'Unique template ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: WorkflowType,
    description: 'Type of workflow methodology'
  })
  @IsEnum(WorkflowType)
  type: WorkflowType;

  @ApiProperty({ 
    enum: WorkflowStatus,
    description: 'Current status of the template'
  })
  @IsEnum(WorkflowStatus)
  status: WorkflowStatus;

  @ApiProperty({ description: 'Whether this is the default template' })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({ description: 'Template version number' })
  @IsNumber()
  version: number;

  @ApiProperty({ description: 'Number of times this template has been used' })
  @IsNumber()
  usageCount: number;

  @ApiPropertyOptional({ description: 'Last time this template was used' })
  @IsOptional()
  @IsDate()
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDate()
  updatedAt: Date;
}

export class WorkflowStageDto {
  @ApiProperty({ description: 'Unique stage ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Stage name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Stage description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: StageType,
    description: 'Type of stage'
  })
  @IsEnum(StageType)
  type: StageType;

  @ApiProperty({ 
    enum: StageStatus,
    description: 'Current status of the stage'
  })
  @IsEnum(StageStatus)
  status: StageStatus;

  @ApiProperty({ description: 'Order of the stage in the workflow' })
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ description: 'Estimated duration in the specified unit' })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Duration unit (days, weeks, months)' })
  @IsOptional()
  @IsString()
  durationUnit?: string;

  @ApiPropertyOptional({ description: 'Entry criteria for the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entryCriteria?: string[];

  @ApiPropertyOptional({ description: 'Exit criteria for the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exitCriteria?: string[];

  @ApiPropertyOptional({ description: 'Deliverables for the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ description: 'Roles involved in the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'RACI matrix for the stage' })
  @IsOptional()
  raciMatrix?: Record<string, string>;

  @ApiProperty({ description: 'Whether the stage requires approval' })
  @IsBoolean()
  requiresApproval: boolean;

  @ApiProperty({ description: 'Whether this is a milestone stage' })
  @IsBoolean()
  isMilestone: boolean;

  @ApiPropertyOptional({ description: 'Stage dependencies' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDate()
  updatedAt: Date;
}

export class WorkflowApprovalDto {
  @ApiProperty({ description: 'Unique approval ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ 
    enum: ApprovalType,
    description: 'Type of approval'
  })
  @IsEnum(ApprovalType)
  type: ApprovalType;

  @ApiProperty({ 
    enum: ApprovalStatus,
    description: 'Current status of the approval'
  })
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiProperty({ 
    enum: ApprovalLevel,
    description: 'Level of approval required'
  })
  @IsEnum(ApprovalLevel)
  level: ApprovalLevel;

  @ApiProperty({ description: 'Approval title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Approval description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Approval criteria' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];

  @ApiPropertyOptional({ description: 'Required documents for approval' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'Due date for the approval' })
  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @ApiProperty({ description: 'Whether this approval is required' })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ description: 'Whether this approval can be skipped' })
  @IsBoolean()
  canBeSkipped: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDate()
  updatedAt: Date;
}

// Request DTOs
export class CreateWorkflowTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: WorkflowType,
    description: 'Type of workflow methodology'
  })
  @IsEnum(WorkflowType)
  type: WorkflowType;

  @ApiProperty({ description: 'Array of workflow stages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStageDto)
  stages: CreateWorkflowStageDto[];

  @ApiPropertyOptional({ description: 'Array of workflow approvals' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowApprovalDto)
  approvals?: CreateWorkflowApprovalDto[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateWorkflowStageDto {
  @ApiProperty({ description: 'Stage name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Stage description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: StageType,
    description: 'Type of stage'
  })
  @IsEnum(StageType)
  type: StageType;

  @ApiProperty({ description: 'Order of the stage in the workflow' })
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ description: 'Estimated duration in the specified unit' })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Duration unit (days, weeks, months)' })
  @IsOptional()
  @IsString()
  durationUnit?: string;

  @ApiPropertyOptional({ description: 'Entry criteria for the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entryCriteria?: string[];

  @ApiPropertyOptional({ description: 'Exit criteria for the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exitCriteria?: string[];

  @ApiPropertyOptional({ description: 'Deliverables for the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ description: 'Roles involved in the stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'RACI matrix for the stage' })
  @IsOptional()
  raciMatrix?: Record<string, string>;

  @ApiProperty({ description: 'Whether the stage requires approval' })
  @IsBoolean()
  requiresApproval: boolean;

  @ApiProperty({ description: 'Whether this is a milestone stage' })
  @IsBoolean()
  isMilestone: boolean;

  @ApiPropertyOptional({ description: 'Stage dependencies' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateWorkflowApprovalDto {
  @ApiProperty({ 
    enum: ApprovalType,
    description: 'Type of approval'
  })
  @IsEnum(ApprovalType)
  type: ApprovalType;

  @ApiProperty({ 
    enum: ApprovalLevel,
    description: 'Level of approval required'
  })
  @IsEnum(ApprovalLevel)
  level: ApprovalLevel;

  @ApiProperty({ description: 'Approval title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Approval description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Approval criteria' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];

  @ApiPropertyOptional({ description: 'Required documents for approval' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'Due date for the approval' })
  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @ApiProperty({ description: 'Whether this approval is required' })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ description: 'Whether this approval can be skipped' })
  @IsBoolean()
  canBeSkipped: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

// Update DTOs
export class UpdateWorkflowTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    enum: WorkflowType,
    description: 'Type of workflow methodology'
  })
  @IsOptional()
  @IsEnum(WorkflowType)
  type?: WorkflowType;

  @ApiPropertyOptional({ 
    enum: WorkflowStatus,
    description: 'Current status of the template'
  })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({ description: 'Whether this is the default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CloneTemplateDto {
  @ApiProperty({ description: 'Name for the cloned template' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description for the cloned template' })
  @IsOptional()
  @IsString()
  description?: string;
}

// Response DTOs
export class WorkflowTemplateWithRelationsDto extends WorkflowTemplateDto {
  @ApiProperty({ description: 'Array of workflow stages', type: [WorkflowStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  stages: WorkflowStageDto[];

  @ApiProperty({ description: 'Array of workflow approvals', type: [WorkflowApprovalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowApprovalDto)
  approvals: WorkflowApprovalDto[];
}

export class WorkflowTemplatesResponseDto {
  @ApiProperty({ description: 'Array of workflow templates', type: [WorkflowTemplateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTemplateDto)
  templates: WorkflowTemplateDto[];

  @ApiProperty({ description: 'Total number of templates' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Current page number' })
  @IsNumber()
  page: number;

  @ApiProperty({ description: 'Number of templates per page' })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  @IsNumber()
  totalPages: number;
}

// Workflow Execution DTOs
export class WorkflowExecutionDto {
  @ApiProperty({ description: 'Execution ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Execution status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Execution progress (0-100)' })
  @IsNumber()
  progress: number;

  @ApiPropertyOptional({ description: 'Execution result' })
  @IsOptional()
  result?: any;

  @ApiPropertyOptional({ description: 'Execution error' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class WorkflowStageTransitionDto {
  @ApiProperty({ description: 'Workflow instance ID' })
  @IsUUID()
  workflowInstanceId: string;

  @ApiProperty({ description: 'Stage ID' })
  @IsUUID()
  stageId: string;

  @ApiProperty({ description: 'Old stage status' })
  @IsString()
  oldStatus: string;

  @ApiProperty({ description: 'New stage status' })
  @IsString()
  newStatus: string;

  @ApiProperty({ description: 'User ID performing the transition' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Transition reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkWorkflowOperationDto {
  @ApiProperty({ description: 'Array of workflow operations' })
  @IsArray()
  operations: any[];
}

export class WorkflowMetricsDto {
  @ApiProperty({ description: 'Total executions' })
  @IsNumber()
  totalExecutions: number;

  @ApiProperty({ description: 'Successful executions' })
  @IsNumber()
  successfulExecutions: number;

  @ApiProperty({ description: 'Failed executions' })
  @IsNumber()
  failedExecutions: number;

  @ApiProperty({ description: 'Average execution time' })
  @IsNumber()
  averageExecutionTime: number;

  @ApiProperty({ description: 'Current concurrent executions' })
  @IsNumber()
  currentConcurrentExecutions: number;
}

// Complex Workflow DTOs
export class CreateComplexWorkflowDto extends CreateWorkflowTemplateDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'User ID creating the workflow' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
