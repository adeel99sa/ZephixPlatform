import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AIFormGeneratorService } from '../services/ai-form-generator.service';
import { IntakeFormService } from '../services/intake-form.service';
import {
  GenerateFormFromDescriptionDto,
  RefineFormDto,
  PreviewFormDto,
  DeployFormDto,
  AIFormFeedbackDto,
  BulkFormGenerationDto,
  FormAnalysisRequestDto,
  GeneratedFormResult,
  FormAnalysisResult,
  ConversationResponse,
  BulkGenerationResult
} from '../dto/ai-form-generation.dto';

@Controller('api/pm/intake-designer')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class IntakeDesignerController {
  private readonly logger = new Logger(IntakeDesignerController.name);

  constructor(
    private aiFormGenerator: AIFormGeneratorService,
    private intakeFormService: IntakeFormService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateFromDescription(
    @Body() dto: GenerateFormFromDescriptionDto,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any
  ): Promise<GeneratedFormResult> {
    this.logger.log(`🎯 Generating form from description for org ${orgId}`);
    
    try {
      const result = await this.aiFormGenerator.generateFormFromDescription(
        dto.description,
        orgId,
        {
          department: dto.department,
          projectType: dto.projectType,
          requiredIntegrations: dto.requiredIntegrations
        }
      );

      // Log generation event for analytics
      this.logger.log(`✅ Form generated with ${(result.confidence * 100).toFixed(1)}% confidence`);
      
      return {
        ...result,
        previewUrl: `/api/pm/intake-designer/preview/${Buffer.from(JSON.stringify(result.formStructure)).toString('base64')}`
      };
    } catch (error) {
      this.logger.error(`❌ Form generation failed: ${error.message}`);
      throw new InternalServerErrorException('Form generation failed. Please try again.');
    }
  }

  @Post('conversation')
  @HttpCode(HttpStatus.OK)
  async handleConversation(
    @Body() body: { message: string; context?: any },
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any
  ): Promise<ConversationResponse> {
    this.logger.log(`💬 Processing conversation message for org ${orgId}`);
    
    try {
      const { message, context } = body;
      
      // Analyze the message to determine intent
      const intent = await this.analyzeMessageIntent(message);
      
      switch (intent.type) {
        case 'generate':
          const generateDto: GenerateFormFromDescriptionDto = {
            description: message,
            department: intent.department,
            projectType: intent.projectType
          };
          
          const generationResult = await this.generateFromDescription(generateDto, orgId, user);
          
          return {
            message: `I've generated a ${generationResult.generationMetadata.complexity} intake form based on your description. The form has ${generationResult.formStructure.fields.length} fields organized into ${generationResult.formStructure.sections.length} sections.`,
            type: 'generation',
            data: generationResult,
            suggestions: generationResult.suggestedImprovements.slice(0, 3),
            nextSteps: [
              'Preview the generated form',
              'Request refinements',
              'Deploy the form'
            ]
          };

        case 'refine':
          if (!context?.existingForm) {
            throw new BadRequestException('No existing form context provided for refinement');
          }
          
          const refineDto: RefineFormDto = {
            existingForm: context.existingForm,
            refinementRequest: message
          };
          
          const refinementResult = await this.refineForm('temp', refineDto);
          
          return {
            message: 'I\'ve applied your requested changes to the form.',
            type: 'refinement',
            data: refinementResult,
            suggestions: ['Preview the updated form', 'Make additional changes'],
            nextSteps: ['Deploy the refined form']
          };

        case 'clarification':
          return {
            message: intent.clarificationQuestion!,
            type: 'clarification',
            suggestions: intent.suggestions
          };

        default:
          return {
            message: 'I can help you create intake forms using natural language. Try describing what kind of form you need, like: "Create a marketing project request form that captures project name, budget, timeline, and key stakeholders."',
            type: 'acknowledgment',
            suggestions: [
              'Create a project intake form',
              'Build a support request form',
              'Design a vendor onboarding form'
            ]
          };
      }
    } catch (error) {
      this.logger.error(`❌ Conversation handling failed: ${error.message}`);
      return {
        message: 'I encountered an issue processing your request. Could you please try rephrasing?',
        type: 'error'
      };
    }
  }

  @Post(':formId/refine')
  async refineForm(
    @Param('formId') formId: string,
    @Body() dto: RefineFormDto
  ): Promise<GeneratedFormResult> {
    this.logger.log(`🔄 Refining form ${formId}`);
    
    try {
      const result = await this.aiFormGenerator.refineForm(
        dto.existingForm,
        dto.refinementRequest
      );

      this.logger.log(`✅ Form refinement completed`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Form refinement failed: ${error.message}`);
      throw new InternalServerErrorException('Form refinement failed. Please try again.');
    }
  }

  @Post(':formId/preview')
  async previewGenerated(
    @Param('formId') formId: string,
    @Body() dto: PreviewFormDto
  ): Promise<{ previewUrl: string; embedCode: string }> {
    this.logger.log(`👀 Generating preview for form ${formId}`);
    
    try {
      // Generate a temporary preview URL
      const previewToken = Buffer.from(JSON.stringify({
        formStructure: dto.formStructure,
        testMode: dto.testMode || true,
        timestamp: Date.now()
      })).toString('base64url');
      
      const previewUrl = `/intake/preview/${previewToken}`;
      const embedCode = `<iframe src="${previewUrl}" width="100%" height="600" frameborder="0"></iframe>`;
      
      return {
        previewUrl,
        embedCode
      };
    } catch (error) {
      this.logger.error(`❌ Preview generation failed: ${error.message}`);
      throw new InternalServerErrorException('Preview generation failed.');
    }
  }

  @Post(':formId/deploy')
  async deployForm(
    @Param('formId') formId: string,
    @Body() dto: DeployFormDto,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any
  ): Promise<{ formId: string; publicUrl: string; success: boolean }> {
    this.logger.log(`🚀 Deploying AI-generated form for org ${orgId}`);
    
    try {
      // Create the form using the existing service
      const createdForm = await this.intakeFormService.createForm(
        orgId,
        {
          name: dto.name || 'AI Generated Form',
          description: dto.description || 'Generated using AI assistance',
          slug: dto.slug || `ai-form-${Date.now()}`,
          formSchema: dto.formStructure,
          isPublic: dto.isPublic ?? true,
          isActive: dto.isActive ?? true,
          settings: {
            requireLogin: false,
            allowAnonymous: true,
            confirmationMessage: 'Thank you for your submission!',
            emailNotifications: []
          }
        },
        user.id
      );

      const publicUrl = `/intake/${createdForm.slug}`;
      
      this.logger.log(`✅ Form deployed successfully: ${publicUrl}`);
      
      return {
        formId: createdForm.id,
        publicUrl,
        success: true
      };
    } catch (error) {
      this.logger.error(`❌ Form deployment failed: ${error.message}`);
      throw new InternalServerErrorException('Form deployment failed. Please try again.');
    }
  }

  @Post('analyze')
  async analyzeForm(
    @Body() dto: FormAnalysisRequestDto
  ): Promise<FormAnalysisResult> {
    this.logger.log(`🔍 Analyzing form structure`);
    
    try {
      // Perform comprehensive form analysis
      const analysis = await this.performFormAnalysis(dto.formStructure, dto.analysisType);
      
      return analysis;
    } catch (error) {
      this.logger.error(`❌ Form analysis failed: ${error.message}`);
      throw new InternalServerErrorException('Form analysis failed.');
    }
  }

  @Post('bulk-generate')
  async bulkGenerate(
    @Body() dto: BulkFormGenerationDto,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any
  ): Promise<BulkGenerationResult> {
    this.logger.log(`📊 Processing bulk form generation (${dto.requests.length} forms)`);
    
    try {
      // For now, process synchronously; in production, use a queue
      const results: GeneratedFormResult[] = [];
      const errors: Array<{ index: number; error: string }> = [];
      
      for (let i = 0; i < dto.requests.length; i++) {
        try {
          const result = await this.aiFormGenerator.generateFormFromDescription(
            dto.requests[i].description,
            orgId,
            {
              department: dto.requests[i].department,
              projectType: dto.requests[i].projectType,
              requiredIntegrations: dto.requests[i].requiredIntegrations
            }
          );
          results.push(result);
        } catch (error) {
          errors.push({ index: i, error: error.message });
        }
      }
      
      return {
        jobId: `bulk_${Date.now()}`,
        status: 'completed',
        results,
        completedCount: results.length,
        totalCount: dto.requests.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      this.logger.error(`❌ Bulk generation failed: ${error.message}`);
      throw new InternalServerErrorException('Bulk generation failed.');
    }
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Body() dto: AIFormFeedbackDto,
    @CurrentUser() user: any
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`📝 Receiving AI form feedback for form ${dto.formId}`);
    
    try {
      // Store feedback for model improvement
      // In a real implementation, this would go to a feedback collection system
      this.logger.log(`Feedback received: Rating ${dto.rating}/5, Would use again: ${dto.wouldUseAgain}`);
      
      return {
        success: true,
        message: 'Thank you for your feedback! It helps us improve the AI form generator.'
      };
    } catch (error) {
      this.logger.error(`❌ Feedback submission failed: ${error.message}`);
      throw new InternalServerErrorException('Feedback submission failed.');
    }
  }

  @Get('templates')
  async getQuickTemplates(): Promise<Array<{ name: string; description: string; prompt: string }>> {
    return [
      {
        name: 'Marketing Project Request',
        description: 'Capture marketing campaign and project requests',
        prompt: 'Create a marketing project intake form that captures project name, campaign type, target audience, budget range, timeline, key deliverables, and stakeholder information.'
      },
      {
        name: 'IT Support Request',
        description: 'IT help desk and support ticket form',
        prompt: 'Design an IT support request form with fields for issue type, priority level, affected systems, detailed description, business impact, and contact information.'
      },
      {
        name: 'Vendor Onboarding',
        description: 'New vendor registration and onboarding',
        prompt: 'Build a vendor onboarding form that collects company information, services offered, insurance details, references, and compliance documentation.'
      },
      {
        name: 'Event Planning Request',
        description: 'Corporate event and meeting planning',
        prompt: 'Create an event planning request form with event type, date preferences, attendee count, budget, catering needs, AV requirements, and special accommodations.'
      },
      {
        name: 'Training Request',
        description: 'Employee training and development requests',
        prompt: 'Design a training request form that captures training topic, business justification, target audience, preferred format, timeline, and success metrics.'
      }
    ];
  }

  // Private helper methods
  private async analyzeMessageIntent(message: string): Promise<{
    type: 'generate' | 'refine' | 'clarification' | 'general';
    department?: string;
    projectType?: string;
    clarificationQuestion?: string;
    suggestions?: string[];
  }> {
    // Simple intent analysis - in production, this could use a more sophisticated NLP model
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('create') || lowerMessage.includes('build') || lowerMessage.includes('generate') || lowerMessage.includes('make')) {
      return {
        type: 'generate',
        department: this.extractDepartment(message),
        projectType: this.extractProjectType(message)
      };
    }
    
    if (lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('update') || lowerMessage.includes('add') || lowerMessage.includes('remove')) {
      return { type: 'refine' };
    }
    
    if (message.length < 20 || lowerMessage.includes('help') || lowerMessage.includes('what') || lowerMessage.includes('how')) {
      return {
        type: 'clarification',
        clarificationQuestion: 'Could you describe what kind of intake form you\'d like to create? For example, is this for project requests, support tickets, or something else?',
        suggestions: [
          'Project intake form',
          'Support request form',
          'Vendor onboarding form'
        ]
      };
    }
    
    return { type: 'general' };
  }

  private extractDepartment(message: string): string | undefined {
    const departments = ['marketing', 'it', 'hr', 'finance', 'operations', 'sales', 'legal'];
    return departments.find(dept => message.toLowerCase().includes(dept));
  }

  private extractProjectType(message: string): string | undefined {
    const types = ['campaign', 'support', 'onboarding', 'training', 'event', 'request'];
    return types.find(type => message.toLowerCase().includes(type));
  }

  private async performFormAnalysis(formStructure: any, analysisType?: string): Promise<FormAnalysisResult> {
    // Simplified analysis - in production, this would be more comprehensive
    const fieldCount = formStructure.fields?.length || 0;
    const requiredFields = formStructure.fields?.filter((f: any) => f.required)?.length || 0;
    const hasValidation = formStructure.fields?.some((f: any) => f.validation) || false;
    
    const completenessScore = Math.min((fieldCount / 8) * 100, 100); // Assume 8 fields is optimal
    const usabilityScore = requiredFields <= fieldCount * 0.6 ? 85 : 65; // Not too many required fields
    const accessibilityScore = hasValidation ? 90 : 70; // Basic check for validation
    
    return {
      score: (completenessScore + usabilityScore + accessibilityScore) / 3,
      analysis: {
        completeness: {
          score: completenessScore,
          missingElements: fieldCount < 5 ? ['Consider adding more fields for comprehensive data capture'] : [],
          recommendations: fieldCount < 3 ? ['Add contact information fields', 'Include project timeline'] : []
        },
        usability: {
          score: usabilityScore,
          issues: requiredFields > fieldCount * 0.6 ? ['Too many required fields may reduce completion rate'] : [],
          improvements: ['Consider logical field grouping', 'Add helpful field descriptions']
        },
        accessibility: {
          score: accessibilityScore,
          violations: [],
          fixes: !hasValidation ? ['Add input validation for better user experience'] : []
        },
        conversion: {
          estimatedRate: Math.max(75 - (requiredFields * 2), 45),
          optimizations: ['Reduce required fields', 'Add progress indicators', 'Optimize field ordering']
        }
      },
      overallRecommendations: [
        'Test the form with real users',
        'Monitor completion rates after deployment',
        'Consider A/B testing different field configurations'
      ]
    };
  }
}
