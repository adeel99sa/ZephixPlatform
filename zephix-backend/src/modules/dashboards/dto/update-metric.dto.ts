import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetricUnit, MetricGrain } from '../entities/metric-definition.entity';

export class UpdateMetricDto {
  @ApiPropertyOptional({ description: 'Metric name', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Metric description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Workspace ID (optional, for workspace-scoped metrics)',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Metric unit', enum: MetricUnit })
  @IsEnum(MetricUnit)
  @IsOptional()
  unit?: MetricUnit;

  @ApiPropertyOptional({ description: 'Metric grain', enum: MetricGrain })
  @IsEnum(MetricGrain)
  @IsOptional()
  grain?: MetricGrain;

  @ApiPropertyOptional({ description: 'Metric formula (JSON object)' })
  @IsObject()
  @IsOptional()
  formula?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Default filters (JSON object)' })
  @IsObject()
  @IsOptional()
  defaultFilters?: Record<string, any>;
}
