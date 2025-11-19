import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDate,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SuggestionCategory {
  TIMELINE_OPTIMIZATION = 'timeline_optimization',
  BUDGET_OPTIMIZATION = 'budget_optimization',
  RESOURCE_ALLOCATION = 'resource_allocation',
  RISK_MITIGATION = 'risk_mitigation',
  QUALITY_IMPROVEMENT = 'quality_improvement',
  PROCESS_OPTIMIZATION = 'process_optimization',
  TECHNOLOGY_UPGRADE = 'technology_upgrade',
  STAKEHOLDER_MANAGEMENT = 'stakeholder_management',
}

export enum SuggestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  DEPRECATED = 'deprecated',
}

export class AISuggestionDto {
  @ApiProperty({ description: 'Unique suggestion ID' })
  @IsUUID()
  id: string;

  @ApiProperty({
    enum: SuggestionCategory,
    description: 'Category of the suggestion',
  })
  @IsEnum(SuggestionCategory)
  category: SuggestionCategory;

  @ApiProperty({ description: 'Suggestion title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description of the suggestion' })
  @IsString()
  description: string;

  @ApiProperty({
    enum: SuggestionPriority,
    description: 'Priority level of the suggestion',
  })
  @IsEnum(SuggestionPriority)
  priority: SuggestionPriority;

  @ApiProperty({ description: 'Business impact description' })
  @IsString()
  impactDescription: string;

  @ApiProperty({ description: 'Estimated effort in person-days' })
  @IsNumber()
  estimatedEffort: number;

  @ApiProperty({ description: 'Estimated cost savings or benefits' })
  @IsNumber()
  estimatedValue: number;

  @ApiProperty({ description: 'Array of actionable steps' })
  @IsArray()
  actionableSteps: Array<{
    step: string;
    description: string;
    owner: string;
    timeline: string;
    dependencies: string[];
  }>;

  @ApiProperty({ description: 'Implementation timeline estimate' })
  @IsString()
  implementationTimeline: string;

  @ApiProperty({ description: 'Expected outcome description' })
  @IsString()
  expectedOutcome: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Additional context or notes' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ description: 'Data sources used for the suggestion' })
  @IsArray()
  @IsString({ each: true })
  dataSources: string[];

  @ApiProperty({ description: 'Related project IDs' })
  @IsArray()
  @IsString({ each: true })
  relatedProjects: string[];

  @ApiProperty({
    enum: SuggestionStatus,
    description: 'Current status of the suggestion',
  })
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;

  @ApiProperty({ description: 'When the suggestion was created' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'When the suggestion was last updated' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ description: 'Organization ID for data isolation' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'User ID who created the suggestion' })
  @IsUUID()
  userId: string;
}

export class GenerateSuggestionsRequestDto {
  @ApiProperty({ description: 'Project ID to generate suggestions for' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    enum: SuggestionCategory,
    description: 'Specific category to focus on',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SuggestionCategory, { each: true })
  categories?: SuggestionCategory[];

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to generate',
  })
  @IsOptional()
  @IsNumber()
  maxSuggestions?: number;

  @ApiPropertyOptional({ description: 'Minimum confidence threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Additional context for generation' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class UpdateSuggestionStatusDto {
  @ApiProperty({
    enum: SuggestionStatus,
    description: 'New status for the suggestion',
  })
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SuggestionsResponseDto {
  @ApiProperty({
    description: 'Array of AI suggestions',
    type: [AISuggestionDto],
  })
  @IsArray()
  @Type(() => AISuggestionDto)
  suggestions: AISuggestionDto[];

  @ApiProperty({ description: 'Total number of suggestions' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Current page number' })
  @IsNumber()
  page: number;

  @ApiProperty({ description: 'Number of suggestions per page' })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  @IsNumber()
  totalPages: number;

  @ApiProperty({ description: 'When the suggestions were generated' })
  @IsDate()
  @Type(() => Date)
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Next refresh time for suggestions' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  nextRefresh?: Date;
}
