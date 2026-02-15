import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  IsArray,
  ValidateNested,
  IsISO8601,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from '../entities/project.entity';

class CreatePhaseDto {
  @IsString()
  phaseName: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['agile', 'waterfall', 'hybrid', 'scrum', 'kanban'])
  methodology?: string;
}

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsUUID()
  @IsNotEmpty({
    message:
      'workspaceId is required. Projects must be created within a workspace.',
  })
  workspaceId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  estimatedEndDate?: string;

  @IsEnum(ProjectPriority)
  @IsOptional()
  priority?: ProjectPriority;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  actualCost?: number;

  @IsEnum(ProjectRiskLevel)
  @IsOptional()
  riskLevel?: ProjectRiskLevel;

  @IsUUID()
  @IsOptional()
  projectManagerId?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsEnum(['agile', 'waterfall', 'hybrid', 'scrum', 'kanban'])
  methodology?: 'agile' | 'waterfall' | 'hybrid' | 'scrum' | 'kanban';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhaseDto)
  phases?: CreatePhaseDto[];

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  definitionOfDone?: string[];

  @IsOptional()
  @IsBoolean()
  costTrackingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  earnedValueEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  waterfallEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  baselinesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  capacityEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  iterationsEnabled?: boolean;
}
