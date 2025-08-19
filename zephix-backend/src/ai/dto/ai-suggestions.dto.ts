import { IsEnum, IsOptional, IsArray, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SuggestionCategory {
  TIMELINE = 'timeline',
  BUDGET = 'budget',
  RESOURCES = 'resources',
  RISKS = 'risks',
  PROCESS = 'process',
  QUALITY = 'quality',
}

export enum SuggestionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export class AISuggestionDto {
  @ApiProperty({ description: 'Unique suggestion ID' })
  id: string;

  @ApiProperty({ 
    enum: SuggestionCategory,
    description: 'Category of the suggestion'
  })
  @IsEnum(SuggestionCategory)
  category: SuggestionCategory;

  @ApiProperty({ 
    enum: SuggestionPriority,
    description: 'Priority level of the suggestion'
  })
  @IsEnum(SuggestionPriority)
  priority: SuggestionPriority;

  @ApiProperty({ description: 'Suggestion title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description of the suggestion' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'AI reasoning behind the suggestion' })
  @IsString()
  reasoning: string;

  @ApiProperty({ description: 'Impact assessment of the suggestion' })
  impact: {
    @ApiProperty({ description: 'Impact description' })
    @IsString()
    description: string;
    
    @ApiProperty({ enum: ['low', 'medium', 'high'] })
    @IsEnum(['low', 'medium', 'high'])
    magnitude: 'low' | 'medium' | 'high';
    
    @ApiProperty({ enum: ['low', 'medium', 'high'] })
    @IsEnum(['low', 'medium', 'high'])
    effort: 'low' | 'medium' | 'high';
    
    @ApiProperty({ description: 'Implementation timeline' })
    @IsString()
    timeline: string;
  };

  @ApiProperty({ description: 'Actionable steps to implement the suggestion' })
  @IsArray()
  actionableSteps: Array<{
    @ApiProperty({ description: 'Step description' })
    @IsString()
    step: string;
    
    @ApiProperty({ description: 'Person responsible for this step' })
    @IsString()
    owner: string;
    
    @ApiProperty({ description: 'Timeline for this step' })
    @IsString()
    timeline: string;
    
    @ApiProperty({ description: 'Dependencies for this step' })
    @IsArray()
    @IsString({ each: true })
    dependencies: string[];
  }>;

  @ApiProperty({ description: 'Overall implementation timeline' })
  @IsString()
  implementationTimeline: string;

  @ApiProperty({ description: 'Expected outcome of implementing the suggestion' })
  @IsString()
  expectedOutcome: string;

  @ApiProperty({ 
    description: 'Confidence score of the suggestion (0-1)',
    minimum: 0,
    maximum: 1
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Data sources used for the analysis' })
  @IsArray()
  @IsString({ each: true })
  dataSources: string[];

  @ApiProperty({ description: 'Related project IDs' })
  @IsArray()
  @IsString({ each: true })
  relatedProjects: string[];

  @ApiProperty({ 
    enum: SuggestionStatus,
    description: 'Current status of the suggestion'
  })
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;

  @ApiProperty({ description: 'When the suggestion was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the suggestion was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Organization ID for data isolation' })
  organizationId: string;

  @ApiProperty({ description: 'User ID who created the suggestion' })
  userId: string;
}

export class GenerateSuggestionsRequestDto {
  @ApiPropertyOptional({ description: 'Specific project IDs to analyze' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @ApiPropertyOptional({ description: 'Categories to focus on' })
  @IsOptional()
  @IsArray()
  @IsEnum(SuggestionCategory, { each: true })
  categories?: SuggestionCategory[];

  @ApiPropertyOptional({ description: 'Priority level filter' })
  @IsOptional()
  @IsEnum(SuggestionPriority)
  priority?: SuggestionPriority;

  @ApiPropertyOptional({ description: 'Include historical project data' })
  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean;

  @ApiPropertyOptional({ 
    enum: ['basic', 'detailed', 'comprehensive'],
    description: 'Depth of analysis'
  })
  @IsOptional()
  @IsEnum(['basic', 'detailed', 'comprehensive'])
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
}

export class UpdateSuggestionStatusDto {
  @ApiProperty({ 
    enum: SuggestionStatus,
    description: 'New status for the suggestion'
  })
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;

  @ApiPropertyOptional({ description: 'Additional notes about the status change' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'When the suggestion was implemented' })
  @IsOptional()
  implementationDate?: Date;

  @ApiPropertyOptional({ description: 'Actual outcome after implementation' })
  @IsOptional()
  @IsString()
  outcome?: string;
}

export class SuggestionsResponseDto {
  @ApiProperty({ description: 'List of AI suggestions', type: [AISuggestionDto] })
  suggestions: AISuggestionDto[];

  @ApiProperty({ description: 'Summary statistics of suggestions' })
  summary: {
    @ApiProperty({ description: 'Total number of suggestions' })
    @IsNumber()
    total: number;
    
    @ApiProperty({ description: 'Count by category' })
    byCategory: Record<string, number>;
    
    @ApiProperty({ description: 'Count by priority' })
    byPriority: Record<string, number>;
    
    @ApiProperty({ description: 'Count by status' })
    byStatus: Record<string, number>;
  };

  @ApiProperty({ description: 'When the suggestions were generated' })
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Next refresh time for suggestions' })
  nextRefresh?: Date;
}
