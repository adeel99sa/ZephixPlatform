import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
  IsUUID,
  IsEmail,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FormFieldDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({
    enum: [
      'text',
      'textarea',
      'number',
      'date',
      'select',
      'multiselect',
      'file',
      'checkbox',
      'radio',
      'url',
      'email',
      'phone',
    ],
  })
  @IsEnum([
    'text',
    'textarea',
    'number',
    'date',
    'select',
    'multiselect',
    'file',
    'checkbox',
    'radio',
    'url',
    'email',
    'phone',
  ])
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
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  conditional?: {
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'greater_than'
      | 'less_than';
    value: any;
  };
}

export class FormSectionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsArray()
  fields: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  collapsible?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  defaultExpanded?: boolean;
}

export class FormSchemaDto {
  @ApiProperty({ type: [FormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @ApiProperty({ type: [FormSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormSectionDto)
  sections: FormSectionDto[];

  @ApiPropertyOptional({ enum: ['single_column', 'two_column', 'tabs'] })
  @IsEnum(['single_column', 'two_column', 'tabs'])
  @IsOptional()
  layout?: 'single_column' | 'two_column' | 'tabs';

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  styling?: {
    theme: 'default' | 'dark' | 'light' | 'custom';
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export class FormSettingsDto {
  @ApiProperty()
  @IsBoolean()
  requireLogin: boolean;

  @ApiProperty()
  @IsBoolean()
  allowAnonymous: boolean;

  @ApiProperty()
  @IsString()
  confirmationMessage: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  emailNotifications?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  autoAssign?: {
    enabled: boolean;
    assignTo: string;
    rules?: Array<{
      field: string;
      operator: string;
      value: any;
      assignTo: string;
    }>;
  };

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  integrations?: {
    slackWebhook?: string;
    teamsWebhook?: string;
    customWebhooks?: Array<{
      name: string;
      url: string;
      headers?: Record<string, string>;
    }>;
  };
}

export class CreateIntakeFormDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thankYouMessage?: string;

  @ApiProperty({ type: FormSchemaDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FormSchemaDto)
  formSchema: FormSchemaDto;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  targetWorkflowId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ type: FormSettingsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FormSettingsDto)
  settings: FormSettingsDto;
}

export class UpdateIntakeFormDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thankYouMessage?: string;

  @ApiPropertyOptional({ type: FormSchemaDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FormSchemaDto)
  @IsOptional()
  formSchema?: FormSchemaDto;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  targetWorkflowId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: FormSettingsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FormSettingsDto)
  @IsOptional()
  settings?: FormSettingsDto;
}

export class IntakeSubmissionDto {
  @ApiProperty()
  @IsObject()
  formData: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  submitterName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  submitterEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  submitterPhone?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: {
    userAgent?: string;
    referrer?: string;
    timeToComplete?: number;
  };
}

export class ProcessIntakeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  assignTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  createProject?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  workflowTemplateId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectDescription?: string;
}

export class SubmissionListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'processing', 'processed', 'rejected', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'processed', 'rejected', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUUID()
  formId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUUID()
  assignedTo?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class BulkSubmissionActionDto {
  @ApiProperty()
  @IsArray()
  submissionIds: string[];

  @ApiProperty({
    enum: ['assign', 'process', 'reject', 'delete', 'change_priority'],
  })
  @IsEnum(['assign', 'process', 'reject', 'delete', 'change_priority'])
  action: string;

  @ApiPropertyOptional()
  @IsString()
  @IsUUID()
  @IsOptional()
  assignTo?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
