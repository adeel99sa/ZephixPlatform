import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../enums/task.enums';

export class UpdateWorkTaskDto {
  @ApiProperty({ description: 'Task title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Task priority',
    enum: TaskPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: 'Assignee user ID', required: false })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Due date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Estimate in story points', required: false })
  @IsOptional()
  @IsNumber()
  estimatePoints?: number | null;

  @ApiProperty({ description: 'Estimate in hours', required: false })
  @IsOptional()
  @IsNumber()
  estimateHours?: number | null;

  @ApiProperty({ description: 'Remaining hours', required: false })
  @IsOptional()
  @IsNumber()
  remainingHours?: number | null;

  @ApiProperty({ description: 'Actual hours spent', required: false })
  @IsOptional()
  @IsNumber()
  actualHours?: number | null;

  @ApiProperty({ description: 'Iteration ID', required: false })
  @IsOptional()
  @IsUUID()
  iterationId?: string | null;

  @ApiProperty({ description: 'Committed to iteration', required: false })
  @IsOptional()
  @IsBoolean()
  committed?: boolean;

  @ApiProperty({ description: 'Tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Archived flag', required: false })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiProperty({
    description: 'Acceptance criteria items',
    required: false,
    type: 'array',
    items: { type: 'object', properties: { text: { type: 'string' }, done: { type: 'boolean' } } },
  })
  @IsOptional()
  @IsArray()
  acceptanceCriteria?: Array<{ text: string; done: boolean }>;

  @ApiProperty({ description: 'Board rank for ordering within column', required: false })
  @IsOptional()
  @IsNumber()
  rank?: number;

  @ApiProperty({
    description: 'Override WIP limit (admin only)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  wipOverride?: boolean;

  @ApiProperty({
    description: 'Reason for WIP override',
    required: false,
  })
  @IsOptional()
  @IsString()
  wipOverrideReason?: string;
}
