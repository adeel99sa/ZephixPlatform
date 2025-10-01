import { IsEnum, IsString, IsOptional, IsNumber, IsUUID, IsDateString, Min, Max, IsBoolean } from 'class-validator';
import { RiskType, RiskSeverity, RiskStatus } from '../entities/risk.entity';

export class UpdateRiskDto {
  @IsOptional()
  @IsEnum(RiskType)
  type?: RiskType;

  @IsOptional()
  @IsEnum(RiskSeverity)
  severity?: RiskSeverity;

  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  probability?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  impactScore?: number;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}



