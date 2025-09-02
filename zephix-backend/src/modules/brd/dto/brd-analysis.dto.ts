import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectMethodology } from '../entities/generated-project-plan.entity';
import { GeneratedProjectPlanResponseDto } from './brd-response.dto';

export class AnalyzeBRDDto {
  @ApiProperty({
    description: 'ID of the BRD to analyze',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  brdId: string;
}

export class GenerateProjectPlanDto {
  @ApiProperty({
    description: 'ID of the BRD analysis to use for plan generation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  brdAnalysisId: string;

  @ApiProperty({
    description: 'Project methodology to use for plan generation',
    enum: ProjectMethodology,
    example: ProjectMethodology.AGILE,
  })
  @IsEnum(ProjectMethodology)
  methodology: ProjectMethodology;
}

export class BRDAnalysisResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the analysis',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the analyzed BRD',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  brdId: string;

  @ApiProperty({
    description: 'Extracted elements from the BRD analysis',
    additionalProperties: true,
  })
  extractedElements: {
    objectives: string[];
    scope: {
      inclusions: string[];
      exclusions: string[];
      assumptions: string[];
    };
    deliverables: Array<{
      name: string;
      description: string;
      acceptanceCriteria: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
    stakeholders: Array<{
      name: string;
      role: string;
      responsibilities: string[];
      influence: 'high' | 'medium' | 'low';
    }>;
    constraints: {
      timeline: string;
      budget: string;
      resources: string[];
      technology: string[];
      regulatory: string[];
    };
    risks: Array<{
      risk: string;
      impact: 'high' | 'medium' | 'low';
      probability: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
    successCriteria: Array<{
      criteria: string;
      metric: string;
      target: string;
    }>;
  };

  @ApiProperty({
    description: 'Analysis metadata including confidence and quality metrics',
    additionalProperties: true,
  })
  analysisMetadata: {
    confidence: number;
    processingTime: number;
    documentQuality: 'high' | 'medium' | 'low';
    missingElements: string[];
    suggestions: string[];
  };

  @ApiProperty({
    description: 'ID of the user who performed the analysis',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  analyzedBy: string;

  @ApiProperty({
    description: 'When the analysis was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the analysis was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class BRDAnalysisListResponseDto {
  @ApiProperty({
    description: 'List of BRD analyses',
    type: [BRDAnalysisResponseDto],
  })
  data: BRDAnalysisResponseDto[];

  @ApiProperty({
    description: 'Total number of analyses',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages: number;
}

export class GeneratedProjectPlanListResponseDto {
  @ApiProperty({
    description: 'List of generated project plans',
    type: [GeneratedProjectPlanResponseDto],
  })
  data: GeneratedProjectPlanResponseDto[];

  @ApiProperty({
    description: 'Total number of plans',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages: number;
}
