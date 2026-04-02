import { IsArray, IsEnum, IsUUID, IsOptional, IsDateString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../enums/task.enums';

/**
 * Bulk update DTO — supports status, assignee, dueDate, priority.
 * At least one update field must be provided (validated in service).
 * Name kept as BulkStatusUpdateDto for backwards compatibility.
 */
export class BulkStatusUpdateDto {
  @ApiProperty({ description: 'Array of task IDs to update', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  taskIds: string[];

  @ApiProperty({ description: 'New status for all tasks', enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: 'Assignee user ID (null to unassign)', required: false })
  @IsOptional()
  @IsUUID('4')
  assigneeUserId?: string | null;

  @ApiProperty({ description: 'Due date (ISO 8601, null to clear)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ description: 'Priority', enum: TaskPriority, required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
