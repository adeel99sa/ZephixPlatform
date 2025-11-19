import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class RiskSourcesDto {
  @ApiProperty({ description: 'Include project data in analysis' })
  @IsBoolean()
  projectData: boolean;

  @ApiProperty({ description: 'Include external factors in analysis' })
  @IsBoolean()
  externalFactors: boolean;

  @ApiProperty({ description: 'Include stakeholder feedback in analysis' })
  @IsBoolean()
  stakeholderFeedback: boolean;

  @ApiProperty({ description: 'Include historical data in analysis' })
  @IsBoolean()
  historicalData: boolean;

  @ApiProperty({ description: 'Include industry trends in analysis' })
  @IsBoolean()
  industryTrends: boolean;

  @ApiProperty({ description: 'Include market conditions in analysis' })
  @IsBoolean()
  marketConditions: boolean;
}

export class RiskIdentificationInputDto {
  @ApiProperty({ description: 'Project ID for risk analysis' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Risk sources configuration' })
  riskSources: RiskSourcesDto;

  @ApiProperty({
    description: 'Scan depth for risk analysis',
    enum: ['basic', 'comprehensive', 'deep-analysis'],
  })
  @IsEnum(['basic', 'comprehensive', 'deep-analysis'])
  scanDepth: 'basic' | 'comprehensive' | 'deep-analysis';

  @ApiProperty({
    description: 'Focus areas for risk analysis',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];
}
