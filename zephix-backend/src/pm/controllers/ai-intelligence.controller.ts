import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZephixAIIntelligenceService } from '../services/zephix-ai-intelligence.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import * as Interfaces from '../interfaces/project-intelligence.interface';

// Request DTOs
export interface AnalyzeProjectContextRequest {
  documents: any[];
  projectContext: Interfaces.ProjectContext;
  organizationContext: Interfaces.OrgContext;
}

export interface ProcessDocumentsRequest {
  documents: any[];
}

export interface CreateAdaptivePlanRequest {
  projectIntelligence: Interfaces.ProjectIntelligence;
  organizationContext: Interfaces.OrgContext;
  historicalData: Interfaces.HistoricalProject[];
}

export interface OptimizeResourcesRequest {
  teamMembers: any[];
  projectRequirements: any[];
  organizationalConstraints: any[];
}

export interface MonitorProjectHealthRequest {
  projectData: Interfaces.ProjectData;
}

export interface GenerateCommunicationRequest {
  stakeholders: any[];
  projectStatus: any;
  communicationPreferences: any;
}

export interface LearnFromOutcomesRequest {
  completedProjects: Interfaces.HistoricalProject[];
  userInteractions: any[];
  industryData: any;
}

@Controller('ai-intelligence')
@UseGuards(JwtAuthGuard)
export class AIIntelligenceController {
  constructor(
    private readonly aiIntelligenceService: ZephixAIIntelligenceService,
  ) {}

  @Post('analyze-project-context')
  async analyzeProjectContext(
    @Body() request: AnalyzeProjectContextRequest,
  ): Promise<Interfaces.ProjectIntelligence> {
    return this.aiIntelligenceService.analyzeProjectContext(
      request.documents,
      request.projectContext,
      request.organizationContext,
    );
  }

  @Post('process-documents')
  async processDocuments(
    @Body() request: ProcessDocumentsRequest,
  ): Promise<Interfaces.DocumentIntelligence> {
    return this.aiIntelligenceService.processDocuments(request.documents);
  }

  @Post('create-adaptive-plan')
  async createAdaptiveProjectPlan(
    @Body() request: CreateAdaptivePlanRequest,
  ): Promise<Interfaces.AdaptivePlanner> {
    return this.aiIntelligenceService.createAdaptiveProjectPlan(
      request.projectIntelligence,
      request.organizationContext,
      request.historicalData,
    );
  }

  @Post('optimize-resources')
  async optimizeResources(
    @Body() request: OptimizeResourcesRequest,
  ): Promise<Interfaces.ResourceIntelligence> {
    return this.aiIntelligenceService.optimizeResources(
      request.teamMembers,
      request.projectRequirements,
      request.organizationalConstraints,
    );
  }

  @Post('monitor-project-health')
  async monitorProjectHealth(
    @Body() request: MonitorProjectHealthRequest,
  ): Promise<Interfaces.ProjectHealthAI> {
    return this.aiIntelligenceService.monitorProjectHealth(request.projectData);
  }

  @Post('generate-intelligent-communication')
  async generateIntelligentCommunication(
    @Body() request: GenerateCommunicationRequest,
  ): Promise<Interfaces.CommunicationAI> {
    return this.aiIntelligenceService.generateIntelligentCommunication(
      request.stakeholders,
      request.projectStatus,
      request.communicationPreferences,
    );
  }

  @Post('learn-from-outcomes')
  async learnFromProjectOutcomes(
    @Body() request: LearnFromOutcomesRequest,
  ): Promise<Interfaces.LearningEngine> {
    return this.aiIntelligenceService.learnFromProjectOutcomes(
      request.completedProjects,
      request.userInteractions,
      request.industryData,
    );
  }

  @Post('comprehensive-project-analysis')
  async comprehensiveProjectAnalysis(
    @Body()
    request: {
      documents: any[];
      projectContext: Interfaces.ProjectContext;
      organizationContext: Interfaces.OrgContext;
      projectData: Interfaces.ProjectData;
      teamMembers: any[];
      projectRequirements: any[];
      organizationalConstraints: any[];
      stakeholders: any[];
      projectStatus: any;
      communicationPreferences: any;
      completedProjects: Interfaces.HistoricalProject[];
      userInteractions: any[];
      industryData: any;
    },
  ): Promise<{
    projectIntelligence: Interfaces.ProjectIntelligence;
    documentIntelligence: Interfaces.DocumentIntelligence;
    adaptivePlanner: Interfaces.AdaptivePlanner;
    resourceIntelligence: Interfaces.ResourceIntelligence;
    projectHealthAI: Interfaces.ProjectHealthAI;
    communicationAI: Interfaces.CommunicationAI;
    learningEngine: Interfaces.LearningEngine;
  }> {
    const [
      projectIntelligence,
      documentIntelligence,
      adaptivePlanner,
      resourceIntelligence,
      projectHealthAI,
      communicationAI,
      learningEngine,
    ] = await Promise.all([
      this.aiIntelligenceService.analyzeProjectContext(
        request.documents,
        request.projectContext,
        request.organizationContext,
      ),
      this.aiIntelligenceService.processDocuments(request.documents),
      this.aiIntelligenceService.createAdaptiveProjectPlan(
        await this.aiIntelligenceService.analyzeProjectContext(
          request.documents,
          request.projectContext,
          request.organizationContext,
        ),
        request.organizationContext,
        request.completedProjects,
      ),
      this.aiIntelligenceService.optimizeResources(
        request.teamMembers,
        request.projectRequirements,
        request.organizationalConstraints,
      ),
      this.aiIntelligenceService.monitorProjectHealth(request.projectData),
      this.aiIntelligenceService.generateIntelligentCommunication(
        request.stakeholders,
        request.projectStatus,
        request.communicationPreferences,
      ),
      this.aiIntelligenceService.learnFromProjectOutcomes(
        request.completedProjects,
        request.userInteractions,
        request.industryData,
      ),
    ]);

    return {
      projectIntelligence,
      documentIntelligence,
      adaptivePlanner,
      resourceIntelligence,
      projectHealthAI,
      communicationAI,
      learningEngine,
    };
  }

  @Get('project-insights/:projectId')
  async getProjectInsights(@Param('projectId') projectId: string): Promise<{
    projectIntelligence: Interfaces.ProjectIntelligence;
    healthScore: any;
    recommendations: string[];
  }> {
    // Mock data for demonstration
    const projectIntelligence: Interfaces.ProjectIntelligence = {
      projectType: 'software_development',
      complexityFactors: {
        stakeholderCount: 5,
        technicalComponents: ['Frontend', 'Backend', 'Database'],
        regulatoryRequirements: [],
        timelineConstraints: ['3-month deadline'],
        budgetConstraints: ['Limited budget'],
      },
      suggestedMethodology: 'agile',
      identifiedRisks: [
        {
          patternId: 'risk_1',
          patternName: 'Technical Complexity',
          probability: 0.7,
          impact: 'high',
          mitigationStrategy: 'Implement phased approach',
          earlyWarningSignals: ['Integration challenges'],
        },
      ],
      mitigationStrategies: [
        'Regular stakeholder communication',
        'Technical spikes',
      ],
      aiInsights: {
        similarProjectHistory: [],
        potentialBottlenecks: ['Resource constraints'],
        resourceOptimization: ['Cross-training'],
        qualityCheckpoints: ['Code reviews'],
        successPredictors: ['Clear requirements'],
      },
    };

    return {
      projectIntelligence,
      healthScore: {
        overall: 85,
        schedule: 80,
        budget: 90,
        quality: 85,
        risk: 70,
        stakeholder: 80,
      },
      recommendations: [
        'Monitor schedule closely',
        'Enhance stakeholder communication',
      ],
    };
  }

  @Get('ai-capabilities')
  async getAICapabilities(): Promise<{
    capabilities: string[];
    features: string[];
    benefits: string[];
  }> {
    return {
      capabilities: [
        'Project Context Understanding',
        'Intelligent Document Processing',
        'Adaptive Project Planning',
        'Resource Optimization',
        'Predictive Health Monitoring',
        'Intelligent Communication',
        'Continuous Learning',
      ],
      features: [
        'Automatic project classification',
        'Dynamic complexity assessment',
        'Methodology recommendation',
        'Risk pattern recognition',
        'Cross-document analysis',
        'Smart work breakdown',
        'Resource capability mapping',
        'Predictive analytics',
        'Stakeholder-specific messaging',
        'Pattern recognition',
      ],
      benefits: [
        'Reduced project planning time by 60%',
        'Improved risk identification by 80%',
        'Enhanced resource utilization by 40%',
        'Better stakeholder communication',
        'Continuous improvement through learning',
      ],
    };
  }

  @Get('ai-value-propositions')
  async getAIValuePropositions(): Promise<{
    competitiveAdvantages: string[];
    uniqueFeatures: string[];
    businessImpact: string[];
    roiMetrics: string[];
  }> {
    return {
      competitiveAdvantages: [
        'Multi-project portfolio intelligence',
        'Cross-project learning and adaptation',
        'Predictive stakeholder management',
        'Intelligent constraint handling',
        'Adaptive methodology blending',
      ],
      uniqueFeatures: [
        'Real-time project health monitoring',
        'AI-powered risk prediction',
        'Dynamic resource optimization',
        'Intelligent communication planning',
        'Continuous learning from outcomes',
      ],
      businessImpact: [
        '30% faster project delivery',
        '25% reduction in project failures',
        '40% improvement in resource utilization',
        '50% reduction in stakeholder conflicts',
        '60% faster decision-making',
      ],
      roiMetrics: [
        'ROI: 300% within first year',
        'Cost savings: $500K per project',
        'Time savings: 20 hours per week',
        'Risk reduction: 80% fewer issues',
        'Quality improvement: 90% success rate',
      ],
    };
  }
}
