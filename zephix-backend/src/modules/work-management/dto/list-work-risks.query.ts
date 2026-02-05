import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskSeverity, RiskStatus } from '../entities/work-risk.entity';

export class ListWorkRisksQueryDto {
  @ApiProperty({ description: 'Project ID', required: true })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ enum: RiskSeverity })
  @IsOptional()
  @IsEnum(RiskSeverity)
  severity?: RiskSeverity;

  @ApiPropertyOptional({ enum: RiskStatus })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;
}
