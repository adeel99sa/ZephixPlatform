import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ProjectStatus, ProjectPriority, ProjectRiskLevel } from '../entities/project.entity';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsDateString()
  @IsOptional()
  estimatedEndDate?: Date;

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
}