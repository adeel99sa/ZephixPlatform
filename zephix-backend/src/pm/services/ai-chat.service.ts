import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PMKnowledgeChunk } from '../entities/pm-knowledge-chunk.entity';
import { UserProject } from '../entities/user-project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectRisk } from '../entities/project-risk.entity';
import { ProjectStakeholder } from '../entities/project-stakeholder.entity';
import { ZephixAIIntelligenceService } from './zephix-ai-intelligence.service';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  projectId?: string;
  context?: any;
  aiInsights?: any;
}

export interface ChatResponse {
  messageId: string;
  response: string;
  confidence: number;
  aiInsights?: {
    projectIntelligence?: any;
    recommendations?: string[];
    nextActions?: string[];
    riskAssessment?: any;
    resourceOptimization?: any;
  };
  suggestedActions?: Array<{
    type:
      | 'create_project'
      | 'analyze_project'
      | 'optimize_resources'
      | 'generate_report'
      | 'schedule_meeting'
      | 'update_stakeholders';
    title: string;
    description: string;
    data?: any;
  }>;
  followUpQuestions?: string[];
}

export interface ChatContext {
  userId: string;
  projectId?: string;
  portfolioId?: string;
  programId?: string;
  userRole?: string;
  organizationContext?: any;
  conversationHistory?: ChatMessage[];
}

export interface AIAnalysisRequest {
  message: string;
  context: ChatContext;
  projectData?: any;
  documents?: any[];
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    @InjectRepository(PMKnowledgeChunk)
    private pmKnowledgeRepository: Repository<PMKnowledgeChunk>,
    @InjectRepository(UserProject)
    private projectRepository: Repository<UserProject>,
    @InjectRepository(ProjectTask)
    private taskRepository: Repository<ProjectTask>,
    @InjectRepository(ProjectRisk)
    private riskRepository: Repository<ProjectRisk>,
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
    private aiIntelligenceService: ZephixAIIntelligenceService,
  ) {}

  async processMessage(request: AIAnalysisRequest, organizationId: string): Promise<ChatResponse> {
    this.logger.log(`Processing AI chat message: ${request.message}`);

    try {
      // Analyze the user's message intent
      const intent = this.analyzeIntent(request.message);

      // Get relevant project context
      const projectContext = await this.getProjectContext(request.context, organizationId);

      // Process based on intent
      switch (intent.type) {
        case 'project_analysis':
          return await this.handleProjectAnalysis(request, projectContext, organizationId);

        case 'project_creation':
          return await this.handleProjectCreation(request, projectContext);

        case 'resource_optimization':
          return await this.handleResourceOptimization(request, projectContext, organizationId);

        case 'risk_assessment':
          return await this.handleRiskAssessment(request, projectContext, organizationId);

        case 'communication_planning':
          return await this.handleCommunicationPlanning(
            request,
            projectContext,
            organizationId,
          );

        case 'health_monitoring':
          return await this.handleHealthMonitoring(request, projectContext, organizationId);

        case 'general_question':
          return await this.handleGeneralQuestion(request, projectContext);

        default:
          return await this.handleGeneralQuestion(request, projectContext);
      }
    } catch (error) {
      this.logger.error('Error processing AI chat message:', error);
      return this.createErrorResponse(
        'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
      );
    }
  }

  private analyzeIntent(message: string): {
    type: string;
    confidence: number;
    entities: any;
  } {
    const lowerMessage = message.toLowerCase();

    // Project analysis intent
    if (
      this.matchesPattern(lowerMessage, [
        'analyze',
        'review',
        'assess',
        'evaluate',
        'examine',
      ]) &&
      this.matchesPattern(lowerMessage, [
        'project',
        'performance',
        'progress',
        'status',
      ])
    ) {
      return { type: 'project_analysis', confidence: 0.9, entities: {} };
    }

    // Project creation intent
    if (
      this.matchesPattern(lowerMessage, [
        'create',
        'start',
        'new',
        'initiate',
      ]) &&
      this.matchesPattern(lowerMessage, ['project', 'work', 'task'])
    ) {
      return { type: 'project_creation', confidence: 0.9, entities: {} };
    }

    // Resource optimization intent
    if (
      this.matchesPattern(lowerMessage, [
        'optimize',
        'improve',
        'enhance',
        'better',
      ]) &&
      this.matchesPattern(lowerMessage, [
        'resource',
        'team',
        'workload',
        'allocation',
      ])
    ) {
      return { type: 'resource_optimization', confidence: 0.8, entities: {} };
    }

    // Risk assessment intent
    if (
      this.matchesPattern(lowerMessage, [
        'risk',
        'danger',
        'threat',
        'problem',
        'issue',
      ]) &&
      this.matchesPattern(lowerMessage, [
        'assess',
        'evaluate',
        'identify',
        'find',
      ])
    ) {
      return { type: 'risk_assessment', confidence: 0.9, entities: {} };
    }

    // Communication planning intent
    if (
      this.matchesPattern(lowerMessage, [
        'communicate',
        'update',
        'report',
        'meeting',
        'stakeholder',
      ])
    ) {
      return { type: 'communication_planning', confidence: 0.8, entities: {} };
    }

    // Health monitoring intent
    if (
      this.matchesPattern(lowerMessage, [
        'health',
        'status',
        'condition',
        'state',
      ]) &&
      this.matchesPattern(lowerMessage, ['project', 'monitor', 'check'])
    ) {
      return { type: 'health_monitoring', confidence: 0.8, entities: {} };
    }

    return { type: 'general_question', confidence: 0.6, entities: {} };
  }

  private async handleProjectAnalysis(
    request: AIAnalysisRequest,
    projectContext: any,
    organizationId: string,
  ): Promise<ChatResponse> {
    const project = await this.getProject(request.context.projectId || '', organizationId);

    if (!project) {
      return {
        messageId: this.generateMessageId(),
        response:
          "I'd be happy to analyze your project! However, I don't see a specific project selected. Could you please:\n\n1. Select a project from your dashboard, or\n2. Tell me which project you'd like me to analyze, or\n3. Create a new project for analysis",
        confidence: 0.8,
        suggestedActions: [
          {
            type: 'analyze_project',
            title: 'Analyze Current Project',
            description: 'Get comprehensive analysis of your selected project',
            data: { projectId: request.context.projectId },
          },
          {
            type: 'create_project',
            title: 'Create New Project',
            description: 'Start a new project for analysis',
            data: { trigger: 'project_creation' },
          },
        ],
        followUpQuestions: [
          'Which specific aspects of the project would you like me to analyze?',
          'Are you concerned about any particular area like timeline, budget, or team performance?',
          'Would you like me to compare this project with similar projects in your portfolio?',
        ],
      };
    }

    // Use AI intelligence engine for comprehensive analysis
    const projectIntelligence =
      await this.aiIntelligenceService.analyzeProjectContext(
        request.documents || [],
        { projectId: project.id, methodology: project.methodology },
        request.context.organizationContext || this.getDefaultOrgContext(),
      );

    const healthMonitoring =
      await this.aiIntelligenceService.monitorProjectHealth({
        projectId: project.id,
        metrics: [],
        progress: {
          completionPercentage: 0,
          completedTasks: 0,
          totalTasks: 0,
          milestoneProgress: [],
          velocity: 0,
        },
        teamPerformance: {
          teamVelocity: 0,
          qualityMetrics: [],
          stakeholderSatisfaction: 0,
          riskMitigation: 0,
        },
        risks: [],
        issues: [],
      });

    return {
      messageId: this.generateMessageId(),
      response: `## 📊 Project Analysis: ${project.name}\n\n**Project Type**: ${projectIntelligence.projectType.replace('_', ' ')}\n**Recommended Methodology**: ${projectIntelligence.suggestedMethodology}\n**Complexity Level**: ${this.assessComplexityLevel(projectIntelligence.complexityFactors)}\n\n**Key Insights**:\n${this.formatAIInsights(projectIntelligence.aiInsights)}\n\n**Health Status**: ${healthMonitoring.healthScore?.overall || 0}% overall health\n\n**Recommendations**:\n${projectIntelligence.mitigationStrategies.map((strategy) => `• ${strategy}`).join('\n')}`,
      confidence: 0.95,
      aiInsights: {
        projectIntelligence,
        recommendations: projectIntelligence.mitigationStrategies,
        nextActions: this.generateNextActions(projectIntelligence),
        riskAssessment: healthMonitoring.healthScore,
        resourceOptimization:
          projectIntelligence.aiInsights.resourceOptimization,
      },
      suggestedActions: [
        {
          type: 'analyze_project',
          title: 'Deep Dive Analysis',
          description: 'Get detailed analysis of specific project areas',
          data: { projectId: project.id, analysisType: 'comprehensive' },
        },
        {
          type: 'generate_report',
          title: 'Generate Report',
          description: 'Create a detailed project analysis report',
          data: { projectId: project.id, reportType: 'analysis' },
        },
        {
          type: 'schedule_meeting',
          title: 'Schedule Review Meeting',
          description: 'Set up a meeting to discuss project analysis',
          data: { projectId: project.id, meetingType: 'analysis_review' },
        },
      ],
      followUpQuestions: [
        'Would you like me to analyze any specific risks or bottlenecks?',
        'Should I create an action plan based on these findings?',
        'Would you like me to compare this project with industry benchmarks?',
      ],
    };
  }

  private async handleProjectCreation(
    request: AIAnalysisRequest,
    projectContext: any,
  ): Promise<ChatResponse> {
    return {
      messageId: this.generateMessageId(),
      response: `## 🚀 Project Creation Assistant\n\nI'll help you create a new project! To get started, please tell me:\n\n**Essential Information**:\n• Project name\n• Project description\n• Project type (software development, infrastructure, business process, etc.)\n• Timeline requirements\n• Budget constraints\n• Team size\n\n**Optional Details**:\n• Stakeholder information\n• Technical requirements\n• Compliance needs\n• Success criteria\n\nOnce you provide these details, I'll use AI intelligence to:\n• Recommend the optimal methodology\n• Assess project complexity\n• Identify potential risks\n• Suggest resource allocation\n• Create a comprehensive project plan\n\nWhat would you like to name your project?`,
      confidence: 0.9,
      suggestedActions: [
        {
          type: 'create_project',
          title: 'Start Project Creation',
          description: 'Begin creating a new project with AI assistance',
          data: { trigger: 'project_creation_wizard' },
        },
      ],
      followUpQuestions: [
        'What type of project are you planning to create?',
        'Do you have any specific timeline or budget constraints?',
        "What's the primary goal of this project?",
      ],
    };
  }

  private async handleResourceOptimization(
    request: AIAnalysisRequest,
    projectContext: any,
    organizationId: string,
  ): Promise<ChatResponse> {
    const project = await this.getProject(request.context.projectId || '', organizationId);

    if (!project) {
      return {
        messageId: this.generateMessageId(),
        response:
          "I'd be happy to help optimize your resources! To provide the best recommendations, I need to analyze a specific project. Please:\n\n1. Select a project from your dashboard, or\n2. Tell me which project you'd like me to optimize resources for",
        confidence: 0.8,
        suggestedActions: [
          {
            type: 'analyze_project',
            title: 'Select Project for Optimization',
            description: 'Choose a project to optimize resources',
            data: { optimizationType: 'resource' },
          },
        ],
      };
    }

    // Use AI intelligence for resource optimization
    const teamMembers = await this.getTeamMembers(project.id);
    const projectRequirements = await this.getProjectRequirements(project.id);
    const organizationalConstraints = await this.getOrganizationalConstraints(
      request.context,
    );

    const resourceIntelligence =
      await this.aiIntelligenceService.optimizeResources(
        teamMembers,
        projectRequirements,
        organizationalConstraints,
      );

    return {
      messageId: this.generateMessageId(),
      response: `## ⚡ Resource Optimization Analysis\n\n**Project**: ${project.name}\n\n**Team Capability Analysis**:\n${this.formatCapabilityMatrix(resourceIntelligence.capabilityMatrix || {})}\n\n**Optimization Recommendations**:\n${(resourceIntelligence.resourceAllocation?.recommendations || []).map((rec) => `• ${rec}`).join('\n')}\n\n**Skill Gaps Identified**:\n${(resourceIntelligence.skillGaps || []).map((gap) => `• ${gap.skillName}: ${gap.trainingRecommendation}`).join('\n')}\n\n**Training Plans**:\n${(resourceIntelligence.trainingPlans || []).map((plan) => `• ${plan.skillName}: ${plan.trainingType} (${plan.duration} hours)`).join('\n')}`,
      confidence: 0.95,
      aiInsights: {
        resourceOptimization: resourceIntelligence,
        recommendations:
          resourceIntelligence.resourceAllocation?.recommendations || [],
        nextActions: this.generateResourceActions(resourceIntelligence),
      },
      suggestedActions: [
        {
          type: 'optimize_resources',
          title: 'Implement Optimizations',
          description: 'Apply the recommended resource optimizations',
          data: { projectId: project.id, optimizations: resourceIntelligence },
        },
        {
          type: 'generate_report',
          title: 'Resource Report',
          description: 'Generate detailed resource optimization report',
          data: { projectId: project.id, reportType: 'resource_optimization' },
        },
      ],
      followUpQuestions: [
        'Would you like me to implement these resource optimizations?',
        'Should I create training plans for the identified skill gaps?',
        'Would you like me to analyze resource conflicts across multiple projects?',
      ],
    };
  }

  private async handleRiskAssessment(
    request: AIAnalysisRequest,
    projectContext: any,
    organizationId: string,
  ): Promise<ChatResponse> {
    const project = await this.getProject(request.context.projectId || '', organizationId);

    if (!project) {
      return {
        messageId: this.generateMessageId(),
        response:
          "I'd be happy to assess risks for your project! Please select a project from your dashboard or tell me which project you'd like me to analyze for risks.",
        confidence: 0.8,
        suggestedActions: [
          {
            type: 'analyze_project',
            title: 'Select Project for Risk Assessment',
            description: 'Choose a project to assess risks',
            data: { analysisType: 'risk_assessment' },
          },
        ],
      };
    }

    // Use AI intelligence for risk assessment
    const projectData = {
      projectId: project.id,
      metrics: [],
      progress: {
        completionPercentage: 0,
        completedTasks: 0,
        totalTasks: 0,
        milestoneProgress: [],
        velocity: 0,
      },
      teamPerformance: {
        teamVelocity: 0,
        qualityMetrics: [],
        stakeholderSatisfaction: 0,
        riskMitigation: 0,
      },
      risks: [],
      issues: [],
    };

    const healthMonitoring =
      await this.aiIntelligenceService.monitorProjectHealth(projectData);

    return {
      messageId: this.generateMessageId(),
      response: `## ⚠️ Risk Assessment: ${project.name}\n\n**Overall Risk Health**: ${healthMonitoring.healthScore?.risk || 0}%\n\n**Risk Analysis**:\n• **High-Risk Items**: ${
        healthMonitoring.earlyWarnings
          ?.filter((w) => w.severity === 'high' || w.severity === 'critical')
          .map((w) => w.description)
          .join(', ') || 'None identified'
      }\n• **Medium-Risk Items**: ${
        healthMonitoring.earlyWarnings
          ?.filter((w) => w.severity === 'medium')
          .map((w) => w.description)
          .join(', ') || 'None identified'
      }\n• **Early Warning Signals**: ${healthMonitoring.earlyWarnings?.map((w) => w.description).join(', ') || 'None identified'}\n\n**Mitigation Strategies**:\n${healthMonitoring.correctiveActions?.map((action) => `• ${action.description}`).join('\n') || 'No specific strategies identified'}\n\n**Recommendations**:\n${healthMonitoring.healthScore?.recommendations?.map((rec) => `• ${rec}`).join('\n') || 'Continue monitoring project health'}`,
      confidence: 0.95,
      aiInsights: {
        riskAssessment: {
          healthScore: healthMonitoring.healthScore,
          earlyWarnings: healthMonitoring.earlyWarnings,
          correctiveActions: healthMonitoring.correctiveActions,
        },
      },
      suggestedActions: [
        {
          type: 'generate_report',
          title: 'Risk Assessment Report',
          description: 'Generate detailed risk assessment report',
          data: { projectId: project.id, reportType: 'risk_assessment' },
        },
        {
          type: 'schedule_meeting',
          title: 'Risk Review Meeting',
          description: 'Schedule a meeting to discuss risk mitigation',
          data: { projectId: project.id, meetingType: 'risk_review' },
        },
      ],
      followUpQuestions: [
        'Would you like me to create a risk mitigation plan?',
        'Should I set up automated risk monitoring alerts?',
        'Would you like me to analyze risk patterns across your portfolio?',
      ],
    };
  }

  private async handleCommunicationPlanning(
    request: AIAnalysisRequest,
    projectContext: any,
    organizationId: string,
  ): Promise<ChatResponse> {
    const project = await this.getProject(request.context.projectId || '', organizationId);

    if (!project) {
      return {
        messageId: this.generateMessageId(),
        response:
          "I'd be happy to help with communication planning! Please select a project from your dashboard or tell me which project you'd like me to create a communication plan for.",
        confidence: 0.8,
        suggestedActions: [
          {
            type: 'analyze_project',
            title: 'Select Project for Communication Planning',
            description: 'Choose a project to plan communications',
            data: { analysisType: 'communication_planning' },
          },
        ],
      };
    }

    // Use AI intelligence for communication planning
    const stakeholders = await this.getStakeholders(project.id);
    const projectStatus = await this.getProjectStatus(project.id);
    const communicationPreferences = this.getDefaultCommunicationPreferences();

    const communicationIntelligence =
      await this.aiIntelligenceService.generateIntelligentCommunication(
        stakeholders,
        projectStatus,
        communicationPreferences,
      );

    return {
      messageId: this.generateMessageId(),
      response: `## 📢 Communication Plan: ${project.name}\n\n**Stakeholder Updates**:\n${Object.entries(
        communicationIntelligence.stakeholderUpdates || {},
      )
        .map(
          ([id, update]: [string, any]) =>
            `• **${update.role}**: ${update.update}`,
        )
        .join(
          '\n',
        )}\n\n**Meeting Content**:\n• **Agenda**: ${(communicationIntelligence.meetingContent?.agenda || []).join(', ')}\n• **Materials**: ${(communicationIntelligence.meetingContent?.materials || []).join(', ')}\n• **Objectives**: ${(communicationIntelligence.meetingContent?.objectives || []).join(', ')}\n\n**Executive Summary**:\n${communicationIntelligence.executiveSummary?.summary || 'Summary not available'}\n\n**Key Metrics**:\n${(communicationIntelligence.executiveSummary?.keyMetrics || []).map((metric: any) => `• ${metric.name}: ${metric.value}${metric.unit}`).join('\n')}`,
      confidence: 0.95,
      aiInsights: {
        recommendations:
          communicationIntelligence.executiveSummary?.recommendations || [],
        nextActions:
          communicationIntelligence.meetingContent?.followUpActions || [],
      },
      suggestedActions: [
        {
          type: 'update_stakeholders',
          title: 'Send Stakeholder Updates',
          description: 'Send personalized updates to all stakeholders',
          data: {
            projectId: project.id,
            updates: communicationIntelligence.stakeholderUpdates,
          },
        },
        {
          type: 'schedule_meeting',
          title: 'Schedule Status Meeting',
          description: 'Schedule a project status meeting',
          data: { projectId: project.id, meetingType: 'status_update' },
        },
      ],
      followUpQuestions: [
        'Would you like me to send these stakeholder updates automatically?',
        'Should I schedule the status meeting for you?',
        'Would you like me to customize the communication for specific stakeholders?',
      ],
    };
  }

  private async handleHealthMonitoring(
    request: AIAnalysisRequest,
    projectContext: any,
    organizationId: string,
  ): Promise<ChatResponse> {
    const project = await this.getProject(request.context.projectId || '', organizationId);

    if (!project) {
      return {
        messageId: this.generateMessageId(),
        response:
          "I'd be happy to monitor your project health! Please select a project from your dashboard or tell me which project you'd like me to monitor.",
        confidence: 0.8,
        suggestedActions: [
          {
            type: 'analyze_project',
            title: 'Select Project for Health Monitoring',
            description: 'Choose a project to monitor health',
            data: { analysisType: 'health_monitoring' },
          },
        ],
      };
    }

    // Use AI intelligence for health monitoring
    const projectData = {
      projectId: project.id,
      metrics: [],
      progress: {
        completionPercentage: 0,
        completedTasks: 0,
        totalTasks: 0,
        milestoneProgress: [],
        velocity: 0,
      },
      teamPerformance: {
        teamVelocity: 0,
        qualityMetrics: [],
        stakeholderSatisfaction: 0,
        riskMitigation: 0,
      },
      risks: [],
      issues: [],
    };

    const healthMonitoring =
      await this.aiIntelligenceService.monitorProjectHealth(projectData);

    return {
      messageId: this.generateMessageId(),
      response: `## 📊 Project Health Monitor: ${project.name}\n\n**Overall Health Score**: ${healthMonitoring.healthScore?.overall || 0}%\n\n**Component Health**:\n• **Schedule**: ${healthMonitoring.healthScore?.schedule || 0}%\n• **Budget**: ${healthMonitoring.healthScore?.budget || 0}%\n• **Quality**: ${healthMonitoring.healthScore?.quality || 0}%\n• **Risk**: ${healthMonitoring.healthScore?.risk || 0}%\n• **Stakeholder**: ${healthMonitoring.healthScore?.stakeholder || 0}%\n\n**Delivery Forecast**:\n• **Probability**: ${healthMonitoring.deliveryForecast?.probability || 0}%\n• **Confidence**: ${((healthMonitoring.deliveryForecast?.confidence || 0) * 100).toFixed(0)}%\n• **Factors**: ${(healthMonitoring.deliveryForecast?.factors || []).join(', ')}\n\n**Early Warnings**:\n${(healthMonitoring.earlyWarnings || []).map((warning) => `• **${warning.type}**: ${warning.description}`).join('\n')}\n\n**Recommendations**:\n${(healthMonitoring.healthScore?.recommendations || []).map((rec) => `• ${rec}`).join('\n')}`,
      confidence: 0.95,
      aiInsights: {
        recommendations: healthMonitoring.healthScore?.recommendations || [],
        nextActions: (healthMonitoring.correctiveActions || []).map(
          (action) => action.description,
        ),
      },
      suggestedActions: [
        {
          type: 'generate_report',
          title: 'Health Report',
          description: 'Generate detailed project health report',
          data: { projectId: project.id, reportType: 'health_monitoring' },
        },
        {
          type: 'schedule_meeting',
          title: 'Health Review Meeting',
          description: 'Schedule a meeting to discuss project health',
          data: { projectId: project.id, meetingType: 'health_review' },
        },
      ],
      followUpQuestions: [
        'Would you like me to set up automated health monitoring alerts?',
        'Should I create an action plan to address the identified issues?',
        "Would you like me to compare this project's health with industry benchmarks?",
      ],
    };
  }

  private async handleGeneralQuestion(
    request: AIAnalysisRequest,
    projectContext: any,
  ): Promise<ChatResponse> {
    return {
      messageId: this.generateMessageId(),
      response: `## 🤖 Zephix AI Assistant\n\nI'm your intelligent project management assistant! I can help you with:\n\n**📊 Project Analysis**\n• Comprehensive project analysis and insights\n• Performance metrics and health monitoring\n• Risk assessment and mitigation strategies\n\n**🚀 Project Creation**\n• AI-powered project setup and planning\n• Methodology recommendations\n• Resource allocation optimization\n\n**⚡ Resource Optimization**\n• Team capability analysis\n• Skill gap identification\n• Training recommendations\n• Workload optimization\n\n**📢 Communication Planning**\n• Stakeholder-specific messaging\n• Meeting preparation and scheduling\n• Executive summary generation\n\n**⚠️ Risk Management**\n• Risk identification and assessment\n• Early warning systems\n• Mitigation strategy development\n\n**📈 Health Monitoring**\n• Real-time project health tracking\n• Predictive analytics\n• Corrective action recommendations\n\nJust tell me what you'd like to work on, and I'll use AI intelligence to help you succeed!`,
      confidence: 0.9,
      suggestedActions: [
        {
          type: 'analyze_project',
          title: 'Analyze Current Project',
          description: 'Get comprehensive analysis of your selected project',
          data: { analysisType: 'comprehensive' },
        },
        {
          type: 'create_project',
          title: 'Create New Project',
          description: 'Start a new project with AI assistance',
          data: { trigger: 'project_creation' },
        },
      ],
      followUpQuestions: [
        'What type of project are you working on?',
        'Are you looking to analyze an existing project or create a new one?',
        'Do you need help with resource optimization or risk management?',
      ],
    };
  }

  // Helper methods
  private matchesPattern(input: string, keywords: string[]): boolean {
    return keywords.some((keyword) => input.includes(keyword));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getProjectContext(context: ChatContext, organizationId: string): Promise<any> {
    if (context.projectId) {
      return await this.getProject(context.projectId, organizationId);
    }
    return null;
  }

  private async getProject(projectId: string, organizationId: string): Promise<any> {
    if (!projectId) return null;
    return await this.projectRepository.findOne({ where: { id: projectId, organizationId } });
  }

  private async getTeamMembers(projectId: string): Promise<any[]> {
    // Mock team members for demo
    return [
      {
        memberId: 'member_1',
        name: 'John Doe',
        role: 'Project Manager',
        skills: [
          {
            skillId: '1',
            name: 'Project Management',
            category: 'technical',
            level: 'expert',
          },
        ],
        experience: 8,
        availability: 100,
        cost: 100,
      },
    ];
  }

  private async getProjectRequirements(projectId: string): Promise<any[]> {
    // Mock requirements for demo
    return [
      {
        requirementId: 'req_1',
        description: 'Complete project planning',
        priority: 'high',
        complexity: 5,
        dependencies: ['Project Management'],
      },
    ];
  }

  private async getOrganizationalConstraints(
    context: ChatContext,
  ): Promise<any[]> {
    // Mock constraints for demo
    return [
      {
        constraintId: 'constraint_1',
        type: 'budget',
        description: 'Limited budget for additional resources',
        impact: 'medium',
        flexibility: 'flexible',
      },
    ];
  }

  private async getStakeholders(projectId: string): Promise<any[]> {
    // Mock stakeholders for demo
    return [
      {
        stakeholderId: 'stakeholder_1',
        name: 'Project Sponsor',
        role: 'Sponsor',
        influence: 'high',
        interest: 'high',
        communicationPreferences: {
          communicationStyle: 'formal',
          frequency: 'weekly',
          format: 'report',
          detailLevel: 'summary',
        },
      },
    ];
  }

  private async getProjectStatus(projectId: string): Promise<any> {
    return {
      currentPhase: 'planning',
      completionPercentage: 25,
      keyMilestones: [],
      risks: [],
      issues: [],
    };
  }

  private getDefaultCommunicationPreferences(): any {
    return {
      communicationStyle: 'formal',
      frequency: 'weekly',
      format: 'report',
      detailLevel: 'summary',
    };
  }

  private getDefaultOrgContext(): any {
    return {
      organizationId: 'org_1',
      industry: 'technology',
      size: 'medium',
      culture: 'agile',
      constraints: [],
      capabilities: [],
    };
  }

  private assessComplexityLevel(complexityFactors: any): string {
    const score =
      complexityFactors.stakeholderCount +
      complexityFactors.technicalComponents.length +
      complexityFactors.regulatoryRequirements.length;

    if (score <= 3) return 'Low';
    if (score <= 6) return 'Medium';
    return 'High';
  }

  private formatAIInsights(aiInsights: any): string {
    return (
      `• **Similar Projects**: ${aiInsights.similarProjectHistory.length} historical projects analyzed\n` +
      `• **Bottlenecks**: ${aiInsights.potentialBottlenecks.join(', ')}\n` +
      `• **Optimizations**: ${aiInsights.resourceOptimization.join(', ')}\n` +
      `• **Quality Checkpoints**: ${aiInsights.qualityCheckpoints.join(', ')}\n` +
      `• **Success Predictors**: ${aiInsights.successPredictors.join(', ')}`
    );
  }

  private formatCapabilityMatrix(capabilityMatrix: any): string {
    return Object.entries(capabilityMatrix)
      .map(
        ([memberId, capabilities]: [string, any]) =>
          `• **${capabilities.name || memberId}**: ${capabilities.technicalSkills.length} technical skills, ${capabilities.softSkills.length} soft skills`,
      )
      .join('\n');
  }

  private generateNextActions(projectIntelligence: any): string[] {
    return [
      'Implement recommended methodology',
      'Set up stakeholder communication plan',
      'Establish risk monitoring system',
      'Create resource allocation plan',
    ];
  }

  private generateResourceActions(resourceIntelligence: any): string[] {
    return [
      'Implement skill-based task assignment',
      'Set up training programs for identified gaps',
      'Optimize workload distribution',
      'Monitor resource utilization',
    ];
  }

  private createErrorResponse(message: string): ChatResponse {
    return {
      messageId: this.generateMessageId(),
      response: message,
      confidence: 0.5,
    };
  }
}
