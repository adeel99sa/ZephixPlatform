import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskSeverity, RiskStatus } from '../entities/work-risk.entity';

export class CreateWorkRiskDto {
  @ApiProperty({ description: 'Project ID', example: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Risk title', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ description: 'Risk description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RiskSeverity, default: RiskSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(RiskSeverity)
  severity?: RiskSeverity;

  @ApiPropertyOptional({ enum: RiskStatus, default: RiskStatus.OPEN })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
