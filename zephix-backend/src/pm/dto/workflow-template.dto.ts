import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowStageDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['intake_stage', 'project_phase', 'approval_gate', 'orr_section'] })
  @IsEnum(['intake_stage', 'project_phase', 'approval_gate', 'orr_section'])
  type: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  automations?: Array<{
    trigger: string;
    action: string;
    conditions: Record<string, any>;
  }>;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  approvers?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  notifications?: Array<{
    event: string;
    recipients: string[];
    template: string;
  }>;
}

export class WorkflowFieldDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ 
    enum: ['text', 'number', 'date', 'select', 'multiselect', 'file', 'textarea', 'checkbox', 'url', 'email'] 
  })
  @IsEnum(['text', 'number', 'date', 'select', 'multiselect', 'file', 'textarea', 'checkbox', 'url', 'email'])
  type: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  validation?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  helpText?: string;
}

export class WorkflowIntegrationDto {
  @ApiProperty({ enum: ['webhook', 'email', 'api'] })
  @IsEnum(['webhook', 'email', 'api'])
  type: string;

  @ApiProperty()
  @IsString()
  endpoint: string;

  @ApiProperty()
  @IsArray()
  events: string[];

  @ApiProperty()
  @IsObject()
  payload_template: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;
}

export class WorkflowConfigurationDto {
  @ApiProperty({ type: [WorkflowStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  stages: WorkflowStageDto[];

  @ApiProperty({ type: [WorkflowFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowFieldDto)
  fields: WorkflowFieldDto[];

  @ApiPropertyOptional({ type: [WorkflowIntegrationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowIntegrationDto)
  @IsOptional()
  integrations?: WorkflowIntegrationDto[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: {
    allowParallelExecution: boolean;
    autoProgressOnApproval: boolean;
    requireAllApprovals: boolean;
    notifyOnStageChange: boolean;
  };
}

export class CreateWorkflowTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['intake', 'project', 'orr', 'custom'] })
  @IsEnum(['intake', 'project', 'orr', 'custom'])
  type: string;

  @ApiProperty({ type: WorkflowConfigurationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowConfigurationDto)
  configuration: WorkflowConfigurationDto;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: {
    version?: string;
    tags?: string[];
    category?: string;
  };
}

export class UpdateWorkflowTemplateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: WorkflowConfigurationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowConfigurationDto)
  @IsOptional()
  configuration?: WorkflowConfigurationDto;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: {
    version?: string;
    tags?: string[];
    category?: string;
  };
}

export class CloneWorkflowTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  copyInstances?: boolean;
}

export class TemplateListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['intake', 'project', 'orr', 'custom'] })
  @IsOptional()
  @IsEnum(['intake', 'project', 'orr', 'custom'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 20)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class CreateWorkflowInstanceDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  templateId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: {
    sourceType?: 'intake' | 'manual' | 'api';
    sourceId?: string;
    labels?: string[];
  };
}

export class UpdateWorkflowInstanceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['active', 'completed', 'cancelled', 'on_hold', 'failed'] })
  @IsEnum(['active', 'completed', 'cancelled', 'on_hold', 'failed'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;
}

export class WorkflowActionDto {
  @ApiProperty({ enum: ['approve', 'reject', 'move_to_stage', 'assign'] })
  @IsEnum(['approve', 'reject', 'move_to_stage', 'assign'])
  action: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetStageId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  assignTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comments?: string;
}
