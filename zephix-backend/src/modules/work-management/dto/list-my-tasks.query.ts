import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Query DTO for the cross-workspace "My Work" feed (GET /work/my-tasks).
 *
 * Deliberately leaner than ListWorkTasksQueryDto: this surface is a member
 * landing view, not the in-project task board. It exposes a lifecycle-bucket
 * filter (open/done/cancelled) rather than raw status keys, plus due-date
 * range and title search. No projectId / workspace / iteration filters — the
 * feed is intentionally cross-workspace and assignee-scoped to the caller.
 */
const MY_TASKS_BUCKET_VALUES = ['open', 'done', 'cancelled'] as const;
const MY_TASKS_SORT_BY_VALUES = ['dueDate', 'updatedAt', 'createdAt'] as const;
const MY_TASKS_SORT_DIR_VALUES = ['asc', 'desc'] as const;

export type MyTasksBucket = (typeof MY_TASKS_BUCKET_VALUES)[number];
export type MyTasksSortBy = (typeof MY_TASKS_SORT_BY_VALUES)[number];
export type MyTasksSortDir = (typeof MY_TASKS_SORT_DIR_VALUES)[number];

export class ListMyTasksQueryDto {
  @ApiProperty({
    description:
      'Filter by lifecycle bucket. open = not finished, done = complete, cancelled = closed without completion.',
    required: false,
    enum: MY_TASKS_BUCKET_VALUES,
  })
  @IsOptional()
  @IsIn(MY_TASKS_BUCKET_VALUES)
  bucket?: MyTasksBucket;

  @ApiProperty({
    description: 'Due date from (ISO date, inclusive)',
    required: false,
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiProperty({
    description: 'Due date to (ISO date, inclusive)',
    required: false,
    example: '2026-07-31',
  })
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @ApiProperty({ description: 'Text search on task title', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Sort field (default dueDate)',
    required: false,
    enum: MY_TASKS_SORT_BY_VALUES,
  })
  @IsOptional()
  @IsIn(MY_TASKS_SORT_BY_VALUES)
  sortBy?: MyTasksSortBy;

  @ApiProperty({
    description: 'Sort direction (default asc)',
    required: false,
    enum: MY_TASKS_SORT_DIR_VALUES,
  })
  @IsOptional()
  @IsIn(MY_TASKS_SORT_DIR_VALUES)
  sortDir?: MyTasksSortDir;

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
