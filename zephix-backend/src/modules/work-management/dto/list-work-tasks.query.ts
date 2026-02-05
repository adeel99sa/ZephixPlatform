import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task.enums';

const SORT_BY_VALUES = ['dueDate', 'updatedAt', 'createdAt'] as const;
const SORT_DIR_VALUES = ['asc', 'desc'] as const;

export type SortBy = (typeof SORT_BY_VALUES)[number];
export type SortDir = (typeof SORT_DIR_VALUES)[number];

export class ListWorkTasksQueryDto {
  @ApiProperty({ description: 'Filter by project ID', required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: TaskStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filter by status (include only these)',
    required: false,
    example: 'TODO,IN_PROGRESS',
  })
  @IsOptional()
  @IsString()
  includeStatuses?: string;

  @ApiProperty({
    description: 'Filter by status (exclude these)',
    required: false,
    example: 'DONE,CANCELED',
  })
  @IsOptional()
  @IsString()
  excludeStatuses?: string;

  @ApiProperty({ description: 'Filter by assignee user ID', required: false })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({ description: 'Text search on title', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Due date from (ISO date, inclusive)',
    required: false,
    example: '2025-02-02',
  })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiProperty({
    description: 'Due date to (ISO date, inclusive)',
    required: false,
    example: '2025-02-09',
  })
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @ApiProperty({
    description: 'Include archived tasks',
    required: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;

  @ApiProperty({
    description: 'Include soft-deleted tasks (admin/trash)',
    required: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    enum: SORT_BY_VALUES,
  })
  @IsOptional()
  @IsIn(SORT_BY_VALUES)
  sortBy?: SortBy;

  @ApiProperty({
    description: 'Sort direction',
    required: false,
    enum: SORT_DIR_VALUES,
  })
  @IsOptional()
  @IsIn(SORT_DIR_VALUES)
  sortDir?: SortDir;

  @ApiProperty({
    description: 'Limit results',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiProperty({
    description: 'Offset for pagination',
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
