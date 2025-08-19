import { IsEnum, IsOptional, IsArray, IsString, IsNumber, Min, Max, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WorkflowType {
  WATERFALL = 'waterfall',
  AGILE = 'agile',
  HYBRID = 'hybrid',
  CUSTOM = 'custom',
}

export enum WorkflowStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
}

export enum StageType {
  INITIATION = 'initiation',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
  CLOSURE = 'closure',
  CUSTOM = 'custom',
}

export enum StageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

export enum ApprovalType {
  STAGE_ENTRY = 'stage_entry',
  MILESTONE = 'milestone',
  DELIVERABLE = 'deliverable',
  CHANGE_REQUEST = 'change_request',
  PROJECT_CLOSURE = 'project_closure',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  ESCALATED = 'escalated',
}

export enum ApprovalLevel {
  TEAM_LEAD = 'team_lead',
  PROJECT_MANAGER = 'project_manager',
  EXECUTIVE = 'executive',
  STAKEHOLDER = 'stakeholder',
  CUSTOM = 'custom',
}

export class WorkflowTemplateDto {
  @ApiProperty({ description: 'Unique workflow template ID' })
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

  @ApiProperty({ description: 'Template version number' })
  @IsNumber()
  @Min(1)
  version: number;

  @ApiProperty({ description: 'Whether this is the default template for the organization' })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({ description: 'Whether this template is publicly available' })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Number of times this template has been used' })
  @IsNumber()
  @Min(0)
  usageCount: number;

  @ApiPropertyOptional({ description: 'When this template was last used' })
  @IsOptional()
  @IsDateString()
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Array of workflow stages' })
  @IsArray()
  stages: WorkflowStageDto[];

  @ApiPropertyOptional({ description: 'Template tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata in JSON format' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'When the template was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the template was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Organization ID for data isolation' })
  organizationId: string;

  @ApiProperty({ description: 'User ID who created the template' })
  createdBy: string;
}

export class WorkflowStageDto {
  @ApiProperty({ description: 'Unique stage ID' })
  id: string;

  @ApiProperty({ description: 'Stage name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Stage description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: StageType,
    description: 'Type of stage in the workflow'
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
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Estimated duration in days' })
  @IsNumber()
  @Min(1)
  estimatedDuration: number;

  @ApiProperty({ description: 'Duration unit (days, weeks, months)' })
  @IsString()
  durationUnit: string;

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

  @ApiPropertyOptional({ description: 'Deliverables expected from this stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ description: 'Roles required for this stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'RACI matrix for the stage' })
  @IsOptional()
  @IsObject()
  raciMatrix?: Record<string, string>;

  @ApiProperty({ description: 'Whether this stage requires approval' })
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

  @ApiPropertyOptional({ description: 'Additional metadata for the stage' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'When the stage was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the stage was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Workflow template ID this stage belongs to' })
  workflowTemplateId: string;

  @ApiPropertyOptional({ description: 'Array of approval gates for this stage' })
  @IsOptional()
  @IsArray()
  approvals?: WorkflowApprovalDto[];
}

export class WorkflowApprovalDto {
  @ApiProperty({ description: 'Unique approval ID' })
  id: string;

  @ApiProperty({ description: 'Approval title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Approval description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: ApprovalType,
    description: 'Type of approval required'
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

  @ApiProperty({ description: 'Whether this approval is required' })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ description: 'Whether this approval can be skipped' })
  @IsBoolean()
  canBeSkipped: boolean;

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
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'When the approval was granted' })
  @IsOptional()
  @IsDateString()
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'When the approval was rejected' })
  @IsOptional()
  @IsDateString()
  rejectedAt?: Date;

  @ApiPropertyOptional({ description: 'Approval comments' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection if applicable' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Escalation rules' })
  @IsOptional()
  @IsObject()
  escalationRules?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata for the approval' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'When the approval was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the approval was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Workflow stage ID this approval belongs to' })
  workflowStageId: string;

  @ApiPropertyOptional({ description: 'User ID of the reviewer' })
  @IsOptional()
  @IsString()
  reviewerId?: string;
}

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

  @ApiPropertyOptional({ description: 'Whether this should be the default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this template is publicly available' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: 'Array of workflow stages' })
  @IsArray()
  stages: CreateWorkflowStageDto[];

  @ApiPropertyOptional({ description: 'Template tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata in JSON format' })
  @IsOptional()
  @IsObject()
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
    description: 'Type of stage in the workflow'
  })
  @IsEnum(StageType)
  type: StageType;

  @ApiProperty({ description: 'Order of the stage in the workflow' })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Estimated duration in days' })
  @IsNumber()
  @Min(1)
  estimatedDuration: number;

  @ApiProperty({ description: 'Duration unit (days, weeks, months)' })
  @IsString()
  durationUnit: string;

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

  @ApiPropertyOptional({ description: 'Deliverables expected from this stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ description: 'Roles required for this stage' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: 'RACI matrix for the stage' })
  @IsOptional()
  @IsObject()
  raciMatrix?: Record<string, string>;

  @ApiProperty({ description: 'Whether this stage requires approval' })
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

  @ApiPropertyOptional({ description: 'Additional metadata for the stage' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Array of approval gates for this stage' })
  @IsOptional()
  @IsArray()
  approvals?: CreateWorkflowApprovalDto[];
}

export class CreateWorkflowApprovalDto {
  @ApiProperty({ description: 'Approval title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Approval description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    enum: ApprovalType,
    description: 'Type of approval required'
  })
  @IsEnum(ApprovalType)
  type: ApprovalType;

  @ApiProperty({ 
    enum: ApprovalLevel,
    description: 'Level of approval required'
  })
  @IsEnum(ApprovalLevel)
  level: ApprovalLevel;

  @ApiProperty({ description: 'Whether this approval is required' })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ description: 'Whether this approval can be skipped' })
  @IsBoolean()
  canBeSkipped: boolean;

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
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Escalation rules' })
  @IsOptional()
  @IsObject()
  escalationRules?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata for the approval' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

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
    enum: WorkflowStatus,
    description: 'New status for the template'
  })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({ description: 'Whether this should be the default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this template is publicly available' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Template tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata in JSON format' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class WorkflowTemplatesResponseDto {
  @ApiProperty({ description: 'List of workflow templates', type: [WorkflowTemplateDto] })
  templates: WorkflowTemplateDto[];

  @ApiProperty({ description: 'Total number of templates' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of templates per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
