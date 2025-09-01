import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ProjectStatus, ProjectMethodology } from '../entities/project.entity';

export class CreateProjectDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(ProjectMethodology)
  @IsOptional()
  methodology?: ProjectMethodology;

  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  riskLevel?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
