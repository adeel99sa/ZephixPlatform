import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsDateString,
  Length,
  Min,
  Max,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import { WorkItemType, WorkItemStatus } from '../entities/work-item.entity';

export class CreateWorkItemDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  projectId: string;

  @IsString()
  @Length(1, 200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(WorkItemType)
  @IsOptional()
  type: WorkItemType = WorkItemType.TASK;

  @IsEnum(WorkItemStatus)
  @IsOptional()
  status: WorkItemStatus = WorkItemStatus.TODO;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  points?: number;

  @IsISO8601()
  @IsOptional()
  dueDate?: string;
}
