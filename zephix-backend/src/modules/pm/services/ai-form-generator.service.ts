import { Injectable, Logger } from '@nestjs/common';
import { LLMProviderService } from '../../ai-assistant/llm-provider.service';
import {
  FormField,
  FormSection,
  FormSchema,
} from '../entities/intake-form.entity';

export interface FormFieldAnalysis {
  suggestedFields: {
    id: string;
    label: string;
    type: FormField['type'];
    required: boolean;
    confidence: number;
    reasoning: string;
  }[];
  detectedDepartment?: string;
  suggestedWorkflow?: string;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface WorkflowConfiguration {
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
}

export interface GeneratedFormResult {
  formStructure: FormSchema;
  workflowConfiguration: WorkflowConfiguration;
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
}

@Injectable()
export class AIFormGeneratorService {
  private readonly logger = new Logger(AIFormGeneratorService.name);

  constructor(private llmProvider: LLMProviderService) {}

  async generateFormFromDescription(
    description: string,
    organizationId: string,
    options?: {
      department?: string;
      projectType?: string;
      requiredIntegrations?: string[];
    },
  ): Promise<GeneratedFormResult> {
    const startTime = Date.now();

    this.logger.log(
      `🎯 Generating form from natural language description for org ${organizationId}`,
    );

    try {
      // Analyze the description to extract requirements
      const analysis = await this.analyzeDescription(description, options);

      // Generate the form structure using AI
      const formGeneration = await this.generateFormStructure(
        description,
        analysis,
        options,
      );

      // Generate workflow configuration
      const workflowConfig = await this.generateWorkflowLogic(
        formGeneration.formStructure,
        description,
        options,
      );

      // Generate intelligent features
      const intelligentFeatures = await this.generateIntelligentFeatures(
        formGeneration.formStructure,
        description,
      );

      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(
        formGeneration,
        analysis,
      );

      // Generate improvement suggestions
      const improvements = await this.generateImprovementSuggestions(
        formGeneration.formStructure,
        description,
      );

      const result: GeneratedFormResult = {
        formStructure: formGeneration.formStructure,
        workflowConfiguration: workflowConfig,
        intelligentFeatures,
        confidence,
        suggestedImprovements: improvements,
        generationMetadata: {
          originalDescription: description,
          processingTime: Date.now() - startTime,
          modelUsed: this.llmProvider.getProviderSettings().model,
          complexity: analysis.estimatedComplexity,
          detectedPatterns: this.extractPatterns(description),
        },
      };

      this.logger.log(
        `✅ Form generation completed in ${result.generationMetadata.processingTime}ms with ${confidence * 100}% confidence`,
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ Form generation failed: ${error.message}`);
      throw new Error(`AI form generation failed: ${error.message}`);
    }
  }

  async refineForm(
    existingForm: GeneratedFormResult,
    refinementRequest: string,
  ): Promise<GeneratedFormResult> {
    this.logger.log(`🔄 Refining existing form based on user request`);

    try {
      const refinementPrompt = this.buildRefinementPrompt(
        existingForm,
        refinementRequest,
      );

      const llmResponse = await this.llmProvider.sendRequest({
        prompt: refinementPrompt,
        systemPrompt:
          'You are an expert form designer that refines existing forms based on user feedback. Maintain form integrity while applying requested changes.',
        temperature: 0.3,
        maxTokens: 3000,
      });

      const refinedStructure = this.parseAIResponse(llmResponse.content);

      // Merge refinements with existing form
      const updatedForm: GeneratedFormResult = {
        ...existingForm,
        formStructure: refinedStructure.formStructure,
        confidence: Math.min(
          existingForm.confidence * 0.95,
          refinedStructure.confidence || 0.8,
        ),
        suggestedImprovements:
          refinedStructure.suggestedImprovements ||
          existingForm.suggestedImprovements,
        generationMetadata: {
          ...existingForm.generationMetadata,
          processingTime: Date.now() - Date.now(), // Reset for this operation
        },
      };

      this.logger.log(`✅ Form refinement completed`);
      return updatedForm;
    } catch (error) {
      this.logger.error(`❌ Form refinement failed: ${error.message}`);
      throw new Error(`AI form refinement failed: ${error.message}`);
    }
  }

  private async analyzeDescription(
    description: string,
    options?: any,
  ): Promise<FormFieldAnalysis> {
    const analysisPrompt = `
Analyze this project intake form description and extract key requirements:

Description: "${description}"
${options?.department ? `Department: ${options.department}` : ''}
${options?.projectType ? `Project Type: ${options.projectType}` : ''}

Identify:
1. Required form fields (name, type, validation)
2. Department context and workflow needs
3. Complexity level (simple/moderate/complex)
4. Suggested integrations

Return JSON with structure:
{
  "suggestedFields": [
    {
      "id": "field_id",
      "label": "Field Label",
      "type": "text|textarea|select|number|date|email|phone|file|checkbox|radio",
      "required": true|false,
      "confidence": 0.95,
      "reasoning": "Why this field is needed"
    }
  ],
  "detectedDepartment": "department_name",
  "estimatedComplexity": "simple|moderate|complex",
  "suggestedWorkflow": "workflow_type"
}
`;

    const response = await this.llmProvider.sendRequest({
      prompt: analysisPrompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    return this.parseAnalysisResponse(response.content);
  }

  private async generateFormStructure(
    description: string,
    analysis: FormFieldAnalysis,
    options?: any,
  ): Promise<{ formStructure: FormSchema; confidence: number }> {
    const generationPrompt = `
Create a comprehensive intake form structure based on this description:

Description: "${description}"

Analysis suggests these fields: ${JSON.stringify(analysis.suggestedFields)}

Create a complete form with:
1. Well-organized sections
2. Appropriate field types and validation
3. Logical field ordering
4. User-friendly labels and help text
5. Professional styling

Return JSON structure:
{
  "formStructure": {
    "fields": [
      {
        "id": "unique_id",
        "label": "User-friendly label",
        "type": "field_type",
        "required": boolean,
        "placeholder": "helpful placeholder",
        "helpText": "guidance text",
        "options": ["option1", "option2"] // for select/radio fields,
        "validation": {
          "min": number,
          "max": number,
          "pattern": "regex",
          "message": "error message"
        }
      }
    ],
    "sections": [
      {
        "id": "section_id",
        "title": "Section Title",
        "description": "Section description",
        "fields": ["field_id1", "field_id2"]
      }
    ],
    "layout": "single_column|two_column|tabs",
    "styling": {
      "theme": "default",
      "primaryColor": "#3B82F6",
      "backgroundColor": "#F8FAFC",
      "textColor": "#1E293B"
    }
  },
  "confidence": 0.95
}
`;

    const response = await this.llmProvider.sendRequest({
      prompt: generationPrompt,
      temperature: 0.1,
      maxTokens: 4000,
    });

    return this.parseFormStructureResponse(response.content);
  }

  private async generateWorkflowLogic(
    formStructure: FormSchema,
    description: string,
    options?: any,
  ): Promise<WorkflowConfiguration> {
    const workflowPrompt = `
Based on this form structure and description, suggest an appropriate workflow:

Form: ${JSON.stringify(formStructure, null, 2)}
Description: "${description}"

Create workflow configuration with:
1. Approval chains (who approves what, based on field values)
2. Assignment rules (who gets assigned based on form data)
3. Notification triggers
4. Automation opportunities

Return JSON:
{
  "approvalChain": [
    {
      "level": 1,
      "role": "Project Manager",
      "condition": "budget > 10000",
      "threshold": 10000
    }
  ],
  "assignmentRules": [
    {
      "condition": "department === 'Marketing'",
      "assignTo": "marketing_lead",
      "priority": "medium"
    }
  ],
  "notifications": [
    {
      "trigger": "form_submitted",
      "recipients": ["pm@company.com"],
      "template": "new_submission"
    }
  ],
  "automationTriggers": [
    {
      "condition": "priority === 'urgent'",
      "action": "escalate",
      "parameters": {"notify": "manager"}
    }
  ]
}
`;

    const response = await this.llmProvider.sendRequest({
      prompt: workflowPrompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    return this.parseWorkflowResponse(response.content);
  }

  private async generateIntelligentFeatures(
    formStructure: FormSchema,
    description: string,
  ) {
    // Generate conditional logic, validation rules, and integration suggestions
    return {
      conditionalLogic: [],
      validationRules: formStructure.fields
        .filter((f) => f.validation)
        .map((field) => ({
          fieldId: field.id,
          rule: field.validation?.pattern || 'required',
          message: field.validation?.message || `${field.label} is required`,
        })),
      integrationSuggestions: this.suggestIntegrations(description),
      autoFieldTypes: formStructure.fields.reduce(
        (acc, field) => {
          acc[field.id] = field.type;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }

  private async generateImprovementSuggestions(
    formStructure: FormSchema,
    description: string,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Analyze form completeness
    if (formStructure.fields.length < 3) {
      suggestions.push(
        'Consider adding more fields to capture comprehensive project information',
      );
    }

    if (!formStructure.fields.some((f) => f.type === 'date')) {
      suggestions.push(
        'Add a deadline or timeline field to help with project planning',
      );
    }

    if (
      !formStructure.fields.some(
        (f) =>
          f.type === 'select' && f.label.toLowerCase().includes('priority'),
      )
    ) {
      suggestions.push(
        'Include a priority level field to help with request triage',
      );
    }

    if (!formStructure.fields.some((f) => f.type === 'file')) {
      suggestions.push('Consider adding file upload for supporting documents');
    }

    return suggestions;
  }

  private calculateConfidenceScore(
    generation: any,
    analysis: FormFieldAnalysis,
  ): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence based on field coverage
    const requiredFieldsCovered = analysis.suggestedFields.filter((f) =>
      generation.formStructure.fields.some((gf: FormField) =>
        gf.label.toLowerCase().includes(f.label.toLowerCase()),
      ),
    ).length;

    const coverageRatio =
      requiredFieldsCovered / Math.max(analysis.suggestedFields.length, 1);
    confidence += coverageRatio * 0.15;

    // Adjust based on complexity
    if (analysis.estimatedComplexity === 'simple') confidence += 0.05;
    if (analysis.estimatedComplexity === 'complex') confidence -= 0.05;

    return Math.min(Math.max(confidence, 0.3), 0.98);
  }

  private extractPatterns(description: string): string[] {
    const patterns: string[] = [];

    if (description.toLowerCase().includes('budget'))
      patterns.push('financial');
    if (description.toLowerCase().includes('deadline'))
      patterns.push('timeline');
    if (description.toLowerCase().includes('approval'))
      patterns.push('approval_workflow');
    if (description.toLowerCase().includes('marketing'))
      patterns.push('marketing_project');
    if (description.toLowerCase().includes('urgent'))
      patterns.push('priority_handling');

    return patterns;
  }

  private suggestIntegrations(description: string): string[] {
    const integrations: string[] = [];

    if (description.toLowerCase().includes('slack')) integrations.push('slack');
    if (description.toLowerCase().includes('jira')) integrations.push('jira');
    if (description.toLowerCase().includes('email'))
      integrations.push('email_notifications');

    return integrations;
  }

  private buildRefinementPrompt(
    existingForm: GeneratedFormResult,
    refinementRequest: string,
  ): string {
    return `
Refine this existing form based on the user's request:

Current Form: ${JSON.stringify(existingForm.formStructure, null, 2)}

User Refinement Request: "${refinementRequest}"

Apply the requested changes while:
1. Maintaining form integrity
2. Preserving good existing elements
3. Ensuring logical field relationships
4. Updating workflow logic if needed

Return the complete updated form structure in the same JSON format.
`;
  }

  private parseAIResponse(content: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in AI response');
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      throw new Error(`Invalid AI response format: ${error.message}`);
    }
  }

  private parseAnalysisResponse(content: string): FormFieldAnalysis {
    const parsed = this.parseAIResponse(content);
    return {
      suggestedFields: parsed.suggestedFields || [],
      detectedDepartment: parsed.detectedDepartment,
      estimatedComplexity: parsed.estimatedComplexity || 'moderate',
      suggestedWorkflow: parsed.suggestedWorkflow,
    };
  }

  private parseFormStructureResponse(content: string): {
    formStructure: FormSchema;
    confidence: number;
  } {
    const parsed = this.parseAIResponse(content);
    return {
      formStructure: parsed.formStructure,
      confidence: parsed.confidence || 0.8,
    };
  }

  private parseWorkflowResponse(content: string): WorkflowConfiguration {
    const parsed = this.parseAIResponse(content);
    return {
      approvalChain: parsed.approvalChain || [],
      assignmentRules: parsed.assignmentRules || [],
      notifications: parsed.notifications || [],
      automationTriggers: parsed.automationTriggers || [],
    };
  }
}
