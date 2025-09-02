import {
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  BRD = 'brd',
  PROJECT_CHARTER = 'project_charter',
  REQUIREMENTS = 'requirements',
  TECHNICAL_SPEC = 'technical_spec',
}

export enum AnalysisDepth {
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
}

export class AIMappingRequestDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document being analyzed',
    example: DocumentType.BRD,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({
    enum: AnalysisDepth,
    description: 'Level of analysis detail',
    default: AnalysisDepth.DETAILED,
  })
  @IsOptional()
  @IsEnum(AnalysisDepth)
  analysisDepth?: AnalysisDepth = AnalysisDepth.DETAILED;

  @ApiPropertyOptional({
    description: 'Specific fields to extract from the document',
    type: [String],
    example: ['objectives', 'stakeholders', 'timeline'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extractFields?: string[];
}

export class AIMappingResponseDto {
  @ApiProperty({ description: 'Unique analysis ID' })
  id: string;

  @ApiProperty({
    enum: ['pending', 'processing', 'completed', 'failed'],
    description: 'Current status of the analysis',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ description: 'Original document name' })
  documentName: string;

  @ApiProperty({ description: 'Type of document analyzed' })
  documentType: string;

  @ApiPropertyOptional({ description: 'Analysis results when completed' })
  analysis?: {
    projectObjectives: string[];
    scope: {
      included: string[];
      excluded: string[];
      assumptions: string[];
      constraints: string[];
    };
    stakeholders: Array<{
      name: string;
      role: string;
      responsibilities: string[];
      influence: 'high' | 'medium' | 'low';
    }>;
    timeline: {
      estimatedDuration: string;
      milestones: Array<{
        name: string;
        description: string;
        estimatedDate: string;
        dependencies: string[];
      }>;
    };
    resources: {
      humanResources: Array<{
        role: string;
        skillLevel: string;
        quantity: number;
        availability: string;
      }>;
      technicalResources: string[];
      budget: {
        estimated: number;
        currency: string;
        breakdown: Record<string, number>;
      };
    };
    risks: Array<{
      description: string;
      probability: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
      mitigation: string[];
      owner: string;
    }>;
    dependencies: Array<{
      description: string;
      type: 'internal' | 'external' | 'technical' | 'business';
      criticality: 'low' | 'medium' | 'high';
      timeline: string;
    }>;
    successCriteria: Array<{
      criterion: string;
      metric: string;
      target: string;
      measurementMethod: string;
    }>;
    kpis: Array<{
      name: string;
      description: string;
      target: number;
      unit: string;
      frequency: string;
    }>;
  };

  @ApiProperty({
    description: 'Confidence score of the analysis (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.85,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 15000,
  })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: 'When the analysis was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the analysis was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Organization ID for data isolation' })
  organizationId: string;

  @ApiProperty({ description: 'User ID who initiated the analysis' })
  userId: string;
}

export class AIMappingStatusDto {
  @ApiProperty({ description: 'Analysis ID' })
  id: string;

  @ApiProperty({
    enum: ['pending', 'processing', 'completed', 'failed'],
    description: 'Current status',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    minimum: 0,
    maximum: 100,
    example: 75,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiPropertyOptional({ description: 'Estimated completion time' })
  estimatedCompletion?: Date;
}
