import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PhaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  order: number;

  @IsNumber()
  @Min(1)
  estimatedDurationDays: number;
}

export class TaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  estimatedHours: number;

  @IsNumber()
  @Min(0)
  phaseOrder: number; // Which phase this task belongs to

  @IsString()
  @IsOptional()
  assigneeRole?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export class KPIDefinitionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['agile', 'waterfall', 'kanban', 'hybrid', 'custom'])
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';

  @IsString()
  @IsOptional()
  calculationMethod?: string;

  @IsString()
  @IsOptional()
  unit?: string;
}

// Phase 5: Risk preset DTO
export class RiskPresetDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Template local id

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsNotEmpty()
  severity: 'low' | 'medium' | 'high' | 'critical';

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number; // 0-100

  @IsString()
  @IsOptional()
  ownerRoleHint?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// Phase 5: KPI preset DTO
export class KpiPresetDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Template local id

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  metricType: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsEnum(['higher_is_better', 'lower_is_better'])
  @IsNotEmpty()
  direction: 'higher_is_better' | 'lower_is_better';
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['agile', 'waterfall', 'kanban', 'hybrid', 'custom'])
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDto)
  @IsOptional()
  phases?: PhaseDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskTemplateDto)
  @IsOptional()
  taskTemplates?: TaskTemplateDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KPIDefinitionDto)
  @IsOptional()
  availableKPIs?: KPIDefinitionDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultEnabledKPIs?: string[];

  @IsEnum(['organization', 'team', 'personal'])
  @IsOptional()
  scope?: 'organization' | 'team' | 'personal';

  @IsEnum(['SYSTEM', 'ORG', 'WORKSPACE'])
  @IsOptional()
  templateScope?: 'SYSTEM' | 'ORG' | 'WORKSPACE';

  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  // Phase 5: Risk and KPI presets
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskPresetDto)
  @IsOptional()
  riskPresets?: RiskPresetDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiPresetDto)
  @IsOptional()
  kpiPresets?: KpiPresetDto[];
}
