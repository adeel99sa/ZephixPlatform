import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AIChatService,
  AIAnalysisRequest,
  ChatResponse,
  ChatContext,
} from '../services/ai-chat.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

export interface SendMessageRequest {
  message: string;
  context: {
    userId: string;
    projectId?: string;
    portfolioId?: string;
    programId?: string;
    userRole?: string;
    organizationContext?: any;
  };
  projectData?: any;
  documents?: any[];
}

export interface ChatHistoryRequest {
  userId: string;
  projectId?: string;
  limit?: number;
}

@Controller('ai-chat')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
export class AIChatController {
  constructor(private readonly aiChatService: AIChatService) {
    console.log('AIChatController initialized');
  }

  @Post('send-message')
  async sendMessage(
    @Body() request: SendMessageRequest,
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: request.message,
      context: request.context as ChatContext,
      projectData: request.projectData,
      documents: request.documents,
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Post('analyze-project')
  async analyzeProject(
    @Body()
    request: {
      projectId: string;
      context: ChatContext;
      analysisType?:
        | 'comprehensive'
        | 'health'
        | 'risk'
        | 'resource'
        | 'communication';
    },
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: `Analyze this project with ${request.analysisType || 'comprehensive'} analysis`,
      context: request.context,
      projectData: { projectId: request.projectId },
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Post('create-project')
  async createProject(
    @Body()
    request: {
      projectDetails: {
        name: string;
        description?: string;
        type?: string;
        timeline?: string;
        budget?: number;
        teamSize?: number;
      };
      context: ChatContext;
    },
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: `Create a new project: ${request.projectDetails.name} - ${request.projectDetails.description || ''}`,
      context: request.context,
      projectData: request.projectDetails,
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Post('optimize-resources')
  async optimizeResources(
    @Body()
    request: {
      projectId: string;
      context: ChatContext;
      optimizationType?: 'team' | 'workload' | 'skills' | 'budget';
    },
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: `Optimize ${request.optimizationType || 'team'} resources for this project`,
      context: request.context,
      projectData: { projectId: request.projectId },
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Post('assess-risks')
  async assessRisks(
    @Body()
    request: {
      projectId: string;
      context: ChatContext;
      riskType?:
        | 'technical'
        | 'schedule'
        | 'budget'
        | 'stakeholder'
        | 'comprehensive';
    },
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: `Assess ${request.riskType || 'comprehensive'} risks for this project`,
      context: request.context,
      projectData: { projectId: request.projectId },
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Post('plan-communication')
  async planCommunication(
    @Body()
    request: {
      projectId: string;
      context: ChatContext;
      communicationType?: 'stakeholder' | 'team' | 'executive' | 'client';
    },
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: `Plan ${request.communicationType || 'stakeholder'} communication for this project`,
      context: request.context,
      projectData: { projectId: request.projectId },
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Post('monitor-health')
  async monitorHealth(
    @Body()
    request: {
      projectId: string;
      context: ChatContext;
      healthMetrics?: string[];
    },
  ): Promise<ChatResponse> {
    const aiRequest: AIAnalysisRequest = {
      message: `Monitor project health and provide status update`,
      context: request.context,
      projectData: {
        projectId: request.projectId,
        healthMetrics: request.healthMetrics,
      },
    };

    return this.aiChatService.processMessage(aiRequest);
  }

  @Get('capabilities')
  @UseGuards() // Temporarily remove authentication for testing
  async getCapabilities(): Promise<{
    capabilities: string[];
    intents: string[];
    features: string[];
    examples: string[];
  }> {
    return {
      capabilities: [
        'Project Analysis and Insights',
        'Resource Optimization',
        'Risk Assessment and Mitigation',
        'Communication Planning',
        'Health Monitoring',
        'Project Creation Assistance',
        'Stakeholder Management',
        'Performance Analytics',
        'Methodology Recommendations',
        'Training and Skill Gap Analysis',
      ],
      intents: [
        'project_analysis',
        'project_creation',
        'resource_optimization',
        'risk_assessment',
        'communication_planning',
        'health_monitoring',
        'general_question',
      ],
      features: [
        'Natural language processing',
        'Intent recognition',
        'Context-aware responses',
        'AI-powered insights',
        'Suggested actions',
        'Follow-up questions',
        'Real-time analysis',
        'Predictive recommendations',
      ],
      examples: [
        'Analyze my current project and identify potential risks',
        'Help me create a new software development project',
        'Optimize the team resources for my infrastructure project',
        'Assess the risks in my compliance project',
        'Plan stakeholder communication for my business process project',
        'Monitor the health of my analytics project',
        'What methodology should I use for my integration project?',
      ],
    };
  }

  @Get('quick-actions')
  @UseGuards() // Temporarily remove authentication for testing
  async getQuickActions(): Promise<{
    actions: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      category: string;
      message: string;
    }>;
  }> {
    return {
      actions: [
        {
          id: 'analyze_project',
          title: 'Analyze Project',
          description: 'Get comprehensive project analysis with AI insights',
          icon: '📊',
          category: 'analysis',
          message: 'Analyze my current project and provide insights',
        },
        {
          id: 'create_project',
          title: 'Create Project',
          description: 'Start a new project with AI-powered planning',
          icon: '🚀',
          category: 'creation',
          message: 'Help me create a new project',
        },
        {
          id: 'optimize_resources',
          title: 'Optimize Resources',
          description: 'Optimize team allocation and identify skill gaps',
          icon: '⚡',
          category: 'optimization',
          message: 'Optimize resources for my project',
        },
        {
          id: 'assess_risks',
          title: 'Assess Risks',
          description: 'Identify and analyze project risks',
          icon: '⚠️',
          category: 'risk',
          message: 'Assess risks in my project',
        },
        {
          id: 'plan_communication',
          title: 'Plan Communication',
          description: 'Create stakeholder communication plans',
          icon: '📢',
          category: 'communication',
          message: 'Plan communication for my project',
        },
        {
          id: 'monitor_health',
          title: 'Monitor Health',
          description: 'Track project health and performance',
          icon: '📈',
          category: 'monitoring',
          message: 'Monitor the health of my project',
        },
        {
          id: 'generate_report',
          title: 'Generate Report',
          description: 'Create detailed project reports',
          icon: '📋',
          category: 'reporting',
          message: 'Generate a comprehensive project report',
        },
        {
          id: 'schedule_meeting',
          title: 'Schedule Meeting',
          description: 'Set up project review meetings',
          icon: '📅',
          category: 'meetings',
          message: 'Schedule a project review meeting',
        },
      ],
    };
  }

  @Get('project-suggestions/:projectId')
  async getProjectSuggestions(@Param('projectId') projectId: string): Promise<{
    suggestions: Array<{
      type: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      impact: string;
      effort: string;
    }>;
  }> {
    // This would integrate with the AI intelligence engine to get project-specific suggestions
    return {
      suggestions: [
        {
          type: 'analysis',
          title: 'Deep Dive Analysis',
          description:
            'Perform comprehensive project analysis with AI insights',
          priority: 'high',
          impact: 'High - Provides actionable insights',
          effort: 'Low - Automated analysis',
        },
        {
          type: 'optimization',
          title: 'Resource Optimization',
          description: 'Optimize team allocation and identify skill gaps',
          priority: 'medium',
          impact: 'Medium - Improves efficiency',
          effort: 'Medium - Requires team input',
        },
        {
          type: 'risk',
          title: 'Risk Assessment',
          description: 'Identify and analyze potential project risks',
          priority: 'high',
          impact: 'High - Prevents issues',
          effort: 'Low - Automated assessment',
        },
        {
          type: 'communication',
          title: 'Communication Planning',
          description: 'Create stakeholder communication strategy',
          priority: 'medium',
          impact: 'Medium - Improves collaboration',
          effort: 'Low - Automated planning',
        },
        {
          type: 'monitoring',
          title: 'Health Monitoring',
          description: 'Set up automated project health tracking',
          priority: 'medium',
          impact: 'Medium - Early warning system',
          effort: 'Low - Automated monitoring',
        },
      ],
    };
  }

  @Get('ai-insights/:projectId')
  async getAIInsights(@Param('projectId') projectId: string): Promise<{
    insights: {
      projectType: string;
      complexityLevel: string;
      recommendedMethodology: string;
      keyRisks: string[];
      optimizationOpportunities: string[];
      successFactors: string[];
    };
  }> {
    // This would integrate with the AI intelligence engine
    return {
      insights: {
        projectType: 'software_development',
        complexityLevel: 'Medium',
        recommendedMethodology: 'agile',
        keyRisks: [
          'Technical integration complexity',
          'Stakeholder resistance to change',
          'Resource constraints',
        ],
        optimizationOpportunities: [
          'Implement skill-based task assignment',
          'Establish stakeholder communication matrix',
          'Create resource allocation plan',
        ],
        successFactors: [
          'Clear project objectives',
          'Strong stakeholder engagement',
          'Technical expertise availability',
        ],
      },
    };
  }
}
