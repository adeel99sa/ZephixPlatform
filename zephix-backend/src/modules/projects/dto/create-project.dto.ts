import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, Min, Max, IsUUID, IsArray, ValidateNested, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectPriority, ProjectRiskLevel } from '../entities/project.entity';

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
}