import { IsString, IsUUID, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, TaskType } from '../enums/task.enums';

export class CreateWorkTaskDto {
  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Task title', example: 'Implement user authentication' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Task status', enum: TaskStatus, required: false, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: 'Task type', enum: TaskType, required: false, default: TaskType.TASK })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiProperty({ description: 'Task priority', enum: TaskPriority, required: false, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: 'Assignee user ID', required: false })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({ description: 'Reporter user ID', required: false })
  @IsOptional()
  @IsUUID()
  reporterUserId?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Due date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

