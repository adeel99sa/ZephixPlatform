import { IsUUID, IsOptional, IsEnum, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task.enums';

export class ListWorkTasksQueryDto {
  @ApiProperty({ description: 'Filter by project ID', required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ description: 'Filter by status', enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: 'Filter by assignee user ID', required: false })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({ description: 'Text search on title', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Include archived tasks', required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;

  @ApiProperty({ description: 'Limit results', required: false, default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiProperty({ description: 'Offset for pagination', required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

