import { IsArray, IsEnum, IsUUID, IsOptional, IsDateString, ArrayMinSize, IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
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
  @Type(() => String)
  taskIds: string[];

  @ApiProperty({ description: 'New status key — legacy enum value or custom per-project status key (max 50 chars)', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  status?: string;

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
