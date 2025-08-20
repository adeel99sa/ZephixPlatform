import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationSummary {
  totalFields: number;
  completedFields: number;
  completionPercentage: number;
  missingRequired: string[];
  validationErrors: string[];
  isValid: boolean;
  errorCount: number;
  errorsBySection: Record<string, string[]>;
  missingRequiredFields: string[];
}

@Injectable()
export class BRDValidationService implements OnModuleInit {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(BRDValidationService.name);
  }

  onModuleInit() {
    this.logger.info('BRD Validation Service initialized');
  }

  validate(payload: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    // Validate metadata
    if (!payload.metadata?.title || payload.metadata.title.length < 3) {
      errors.push('Title must be at least 3 characters long');
    }

    if (!payload.metadata?.summary || payload.metadata.summary.length < 10) {
      errors.push('Summary must be at least 10 characters long');
    }

    // Validate business context
    if (!payload.businessContext?.problemStatement) {
      errors.push('Problem statement is required');
    }

    if (!payload.businessContext?.businessObjective) {
      errors.push('Business objective is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getValidationSummary(payload: Record<string, any>): ValidationSummary {
    const requiredFields = [
      'metadata.title',
      'metadata.summary',
      'businessContext.problemStatement',
      'businessContext.businessObjective',
    ];

    const missingRequired = requiredFields.filter((field) => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], payload);
      return !value || (typeof value === 'string' && value.trim().length === 0);
    });

    const totalFields = requiredFields.length;
    const completedFields = totalFields - missingRequired.length;
    const completionPercentage = Math.round(
      (completedFields / totalFields) * 100,
    );

    const result = {
      totalFields,
      completedFields,
      completionPercentage,
      missingRequired,
      validationErrors: [],
      isValid: missingRequired.length === 0,
      errorCount: missingRequired.length,
      errorsBySection: {},
      get missingRequiredFields() {
        return this.missingRequired;
      },
    };

    return result;
  }

  getSchema(): Record<string, any> {
    return {
      metadata: {
        title: { type: 'string', required: true, minLength: 3 },
        summary: { type: 'string', required: true, minLength: 10 },
        industry: { type: 'string', required: false },
        department: { type: 'string', required: false },
        priority: {
          type: 'string',
          required: false,
          enum: ['Low', 'Medium', 'High', 'Critical'],
        },
      },
      businessContext: {
        problemStatement: { type: 'string', required: true },
        businessObjective: { type: 'string', required: true },
        successCriteria: { type: 'array', required: false },
        assumptions: { type: 'array', required: false },
        constraints: { type: 'object', required: false },
      },
      functionalRequirements: {
        type: 'array',
        required: false,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' },
            acceptanceCriteria: { type: 'array' },
          },
        },
      },
      nonFunctionalRequirements: {
        type: 'object',
        required: false,
        properties: {
          performance: { type: 'string' },
          security: { type: 'string' },
          scalability: { type: 'string' },
          usability: { type: 'string' },
        },
      },
    };
  }

  // New method to satisfy tests
  async validateBRD(
    brdContent: Record<string, any>,
  ): Promise<ValidationResult> {
    return this.validate(brdContent);
  }

  validateOrThrow(payload: Record<string, any>): void {
    const result = this.validate(payload);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }
  }

  summarize(payload: Record<string, any>): ValidationSummary {
    return this.getValidationSummary(payload);
  }
}
