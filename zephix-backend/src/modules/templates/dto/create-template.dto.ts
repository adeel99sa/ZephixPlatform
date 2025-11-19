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

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
