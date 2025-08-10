import { IsString, IsOptional, IsArray, IsObject, MinLength, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FormSchema } from '../entities/intake-form.entity';

export class GenerateFormFromDescriptionDto {
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredIntegrations?: string[];

  @IsOptional()
  @IsEnum(['simple', 'moderate', 'complex'])
  expectedComplexity?: 'simple' | 'moderate' | 'complex';

  @IsOptional()
  @IsBoolean()
  includeWorkflow?: boolean;

  @IsOptional()
  @IsBoolean()
  enableConditionalLogic?: boolean;
}

export class RefineFormDto {
  @IsObject()
  existingForm: any;

  @IsString()
  @MinLength(5, { message: 'Refinement request must be at least 5 characters long' })
  refinementRequest: string;

  @IsOptional()
  @IsBoolean()
  preserveExistingData?: boolean;
}

export class PreviewFormDto {
  @IsObject()
  formStructure: FormSchema;

  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}

export class DeployFormDto {
  @IsObject()
  formStructure: FormSchema;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AIFormFeedbackDto {
  @IsString()
  formId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvementSuggestions?: string[];

  @IsOptional()
  @IsBoolean()
  wouldUseAgain?: boolean;
}

export class FormGenerationOptionsDto {
  @IsOptional()
  @IsEnum(['minimal', 'standard', 'comprehensive'])
  fieldDetail?: 'minimal' | 'standard' | 'comprehensive';

  @IsOptional()
  @IsBoolean()
  includeValidation?: boolean;

  @IsOptional()
  @IsBoolean()
  generateWorkflow?: boolean;

  @IsOptional()
  @IsBoolean()
  suggestIntegrations?: boolean;

  @IsOptional()
  @IsEnum(['single_column', 'two_column', 'tabs'])
  preferredLayout?: 'single_column' | 'two_column' | 'tabs';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeFieldTypes?: string[];
}

export class BulkFormGenerationDto {
  @IsArray()
  @Type(() => GenerateFormFromDescriptionDto)
  requests: GenerateFormFromDescriptionDto[];

  @IsOptional()
  @Type(() => FormGenerationOptionsDto)
  globalOptions?: FormGenerationOptionsDto;

  @IsOptional()
  @IsBoolean()
  waitForCompletion?: boolean;
}

export class ConversationHistoryDto {
  @IsString()
  sessionId: string;

  @IsArray()
  history: Array<{
    type: 'user' | 'ai';
    message: string;
    timestamp: Date;
    metadata?: any;
  }>;
}

export class FormAnalysisRequestDto {
  @IsObject()
  formStructure: FormSchema;

  @IsOptional()
  @IsString()
  analysisType?: 'completeness' | 'usability' | 'conversion' | 'accessibility';

  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean;
}

// Response DTOs
export interface GeneratedFormResult {
  formStructure: FormSchema;
  workflowConfiguration: {
    approvalChain: Array<{
      level: number;
      role: string;
      condition?: string;
      threshold?: any;
    }>;
    assignmentRules: Array<{
      condition: string;
      assignTo: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }>;
    notifications: Array<{
      trigger: string;
      recipients: string[];
      template: string;
    }>;
    automationTriggers: Array<{
      condition: string;
      action: string;
      parameters: any;
    }>;
  };
  intelligentFeatures: {
    conditionalLogic: Array<{
      fieldId: string;
      conditions: any[];
      actions: any[];
    }>;
    validationRules: Array<{
      fieldId: string;
      rule: string;
      message: string;
    }>;
    integrationSuggestions: string[];
    autoFieldTypes: Record<string, string>;
  };
  confidence: number;
  suggestedImprovements: string[];
  generationMetadata: {
    originalDescription: string;
    processingTime: number;
    modelUsed: string;
    complexity: string;
    detectedPatterns: string[];
  };
  previewUrl?: string;
}

export interface FormAnalysisResult {
  score: number;
  analysis: {
    completeness: {
      score: number;
      missingElements: string[];
      recommendations: string[];
    };
    usability: {
      score: number;
      issues: string[];
      improvements: string[];
    };
    accessibility: {
      score: number;
      violations: string[];
      fixes: string[];
    };
    conversion: {
      estimatedRate: number;
      optimizations: string[];
    };
  };
  overallRecommendations: string[];
}

export interface ConversationResponse {
  message: string;
  type: 'acknowledgment' | 'clarification' | 'generation' | 'refinement' | 'error';
  data?: any;
  suggestions?: string[];
  nextSteps?: string[];
}

export interface BulkGenerationResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  results?: GeneratedFormResult[];
  completedCount: number;
  totalCount: number;
  estimatedTimeRemaining?: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// Validation schemas for complex objects
export const FormStructureValidationSchema = {
  fields: 'array',
  sections: 'array',
  layout: ['single_column', 'two_column', 'tabs'],
  styling: 'object'
};

export const WorkflowConfigValidationSchema = {
  approvalChain: 'array',
  assignmentRules: 'array',
  notifications: 'array',
  automationTriggers: 'array'
};
