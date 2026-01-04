import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricUnit, MetricGrain } from '../entities/metric-definition.entity';

export class CreateMetricDto {
  @ApiProperty({ description: 'Metric key (unique per org)', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  key: string;

  @ApiProperty({ description: 'Metric name', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

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

  @ApiProperty({ description: 'Metric unit', enum: MetricUnit })
  @IsEnum(MetricUnit)
  unit: MetricUnit;

  @ApiProperty({ description: 'Metric grain', enum: MetricGrain })
  @IsEnum(MetricGrain)
  grain: MetricGrain;

  @ApiProperty({ description: 'Metric formula (JSON object)' })
  @IsObject()
  formula: Record<string, any>;

  @ApiPropertyOptional({ description: 'Default filters (JSON object)' })
  @IsObject()
  @IsOptional()
  defaultFilters?: Record<string, any>;
}

