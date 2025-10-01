import { IsOptional, IsUUID, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HeatmapQueryDto {
  @ApiPropertyOptional({
    description: 'Workspace ID to filter resources',
    example: 'f1f1b5b5-3b2e-44e6-9420-e1e02c4c0e40'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Workspace ID must be a valid UUID' })
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Project ID to filter resources',
    example: 'f1f1b5b5-3b2e-44e6-9420-e1e02c4c0e40'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Project ID must be a valid UUID' })
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Start date for heatmap data (ISO 8601 format)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for heatmap data (ISO 8601 format)',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of weeks to display',
    minimum: 1,
    maximum: 52,
    default: 12
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Weeks must be an integer' })
  @Min(1, { message: 'Weeks must be at least 1' })
  @Max(52, { message: 'Weeks cannot exceed 52' })
  weeks?: number = 12;

  @ApiPropertyOptional({
    description: 'Include only resources with conflicts',
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  conflictsOnly?: boolean = false;

  @ApiPropertyOptional({
    description: 'Minimum utilization percentage to include',
    minimum: 0,
    maximum: 100,
    default: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Min utilization must be an integer' })
  @Min(0, { message: 'Min utilization cannot be negative' })
  @Max(100, { message: 'Min utilization cannot exceed 100' })
  minUtilization?: number = 0;
}
