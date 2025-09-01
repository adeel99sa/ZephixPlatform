import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  AIPMAssistantService,
  ProjectContext,
  PMResponse,
  ProjectHealthReport,
  PortfolioRecommendations,
  RiskPredictions,
  CommunicationPlan,
} from '../services/ai-pm-assistant.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

export class PMQuestionDto {
  question: string;
  context?: ProjectContext;
}

export class ProjectAnalysisDto {
  projectId: string;
  includeHealthCheck?: boolean;
  includeRiskAnalysis?: boolean;
  includeStakeholderAnalysis?: boolean;
}

export class GeneratePlanDto {
  projectName: string;
  description?: string;
  methodology?: 'predictive' | 'agile' | 'hybrid' | 'universal';
  scope?: string;
  budget?: number;
  timeline?: string;
  teamSize?: number;
  complexity?: 'low' | 'medium' | 'high';
}

export class PortfolioDto {
  portfolioId: string;
  includeResourceOptimization?: boolean;
  includeRiskMitigation?: boolean;
  includeScheduleOptimization?: boolean;
}

export class RiskAnalysisDto {
  projectData: any;
  includePredictions?: boolean;
  includeMitigationStrategies?: boolean;
}

export class StakeholderDto {
  projectId: string;
  includeCommunicationPlan?: boolean;
  includeEngagementStrategy?: boolean;
}

export class ProgressReportDto {
  projectId: string;
  reportType?: 'weekly' | 'monthly' | 'executive';
  includeMetrics?: boolean;
  includeRecommendations?: boolean;
}

export class NextActionsDto {
  projectId: string;
  context?: 'planning' | 'execution' | 'monitoring' | 'closing';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

@Controller('ai-pm-assistant')
@UseGuards(JwtAuthGuard)
export class AIPMAssistantController {
  constructor(private readonly aiPMAssistantService: AIPMAssistantService) {}

  @Post('ask')
  async askPMQuestion(
    @Body() dto: PMQuestionDto,
    @Request() req,
  ): Promise<PMResponse> {
    const userId = req.user.id;
    const context = dto.context ? { ...dto.context, userId } : { userId };

    return this.aiPMAssistantService.askPMQuestion(dto.question, context);
  }

  @Post('analyze-project')
  async analyzeProject(
    @Body() dto: ProjectAnalysisDto,
    @Request() req,
  ): Promise<ProjectHealthReport> {
    const userId = req.user.id;

    // Verify project belongs to user
    // This would be implemented with proper authorization

    return this.aiPMAssistantService.analyzeProjectHealth(dto.projectId);
  }

  @Post('generate-plan')
  async generateProjectPlan(
    @Body() dto: GeneratePlanDto,
    @Request() req,
  ): Promise<any> {
    const userId = req.user.id;

    // Generate comprehensive project plan based on input
    const plan = await this.generateComprehensivePlan(dto, userId);

    return {
      projectPlan: plan,
      recommendations: this.generatePlanRecommendations(dto),
      nextSteps: this.generateNextSteps(dto),
    };
  }

  @Post('optimize-portfolio')
  async optimizePortfolio(
    @Body() dto: PortfolioDto,
    @Request() req,
  ): Promise<PortfolioRecommendations> {
    const userId = req.user.id;

    // Verify portfolio belongs to user
    // This would be implemented with proper authorization

    return this.aiPMAssistantService.optimizePortfolio(dto.portfolioId);
  }

  @Post('risk-analysis')
  async analyzeRisks(
    @Body() dto: RiskAnalysisDto,
    @Request() req,
  ): Promise<RiskPredictions> {
    const userId = req.user.id;

    return this.aiPMAssistantService.predictProjectRisks(dto.projectData);
  }

  @Post('stakeholder-plan')
  async createStakeholderPlan(
    @Body() dto: StakeholderDto,
    @Request() req,
  ): Promise<CommunicationPlan> {
    const userId = req.user.id;

    // Verify project belongs to user
    // This would be implemented with proper authorization

    return this.aiPMAssistantService.generateStakeholderUpdates(dto.projectId);
  }

  @Post('progress-report')
  async generateProgressReport(
    @Body() dto: ProgressReportDto,
    @Request() req,
  ): Promise<any> {
    const userId = req.user.id;

    // Generate automated progress report
    const report = await this.generateAutomatedReport(dto, userId);

    return {
      report,
      metrics: this.calculateReportMetrics(dto),
      recommendations: this.generateReportRecommendations(dto),
    };
  }

  @Post('next-actions')
  async getNextActions(
    @Body() dto: NextActionsDto,
    @Request() req,
  ): Promise<any> {
    const userId = req.user.id;

    // Get smart recommendations for next actions
    const actions = await this.getSmartRecommendations(dto, userId);

    return {
      actions,
      priority: dto.priority || 'medium',
      context: dto.context || 'execution',
      estimatedEffort: this.estimateActionEffort(actions),
    };
  }

  @Get('knowledge/:domain')
  async getPMKnowledge(
    @Param('domain') domain: string,
    @Request() req,
  ): Promise<any> {
    const userId = req.user.id;

    // Get relevant PM knowledge for the domain
    const knowledge = await this.getDomainKnowledge(domain);

    return {
      domain,
      knowledge,
      bestPractices: this.getBestPractices(domain),
      methodologies: this.getMethodologies(domain),
    };
  }

  @Get('test-ai-chat')
  @UseGuards() // Temporarily remove authentication for testing
  async testAIChat(): Promise<any> {
    console.log('AI Chat test endpoint called');
    return {
      message: 'AI Chat Service is working!',
      capabilities: [
        'Project Analysis',
        'Resource Optimization',
        'Risk Assessment',
        'Communication Planning',
        'Health Monitoring',
      ],
      status: 'ready',
    };
  }

  @Get('templates/:type')
  async getPMTemplates(
    @Param('type') type: string,
    @Request() req,
  ): Promise<any> {
    const userId = req.user.id;

    // Get PM templates based on type
    const templates = await this.getTemplatesByType(type);

    return {
      type,
      templates,
      customizationOptions: this.getCustomizationOptions(type),
    };
  }

  // Helper methods for plan generation and analysis
  private async generateComprehensivePlan(
    dto: GeneratePlanDto,
    userId: string,
  ): Promise<any> {
    const plan = {
      projectName: dto.projectName,
      description: dto.description,
      methodology: dto.methodology || 'universal',
      scope: dto.scope,
      budget: dto.budget,
      timeline: dto.timeline,
      teamSize: dto.teamSize,
      complexity: dto.complexity,

      // Generated components
      workBreakdownStructure: this.generateWBS(dto),
      riskRegister: this.generateRiskRegister(dto),
      stakeholderRegister: this.generateStakeholderRegister(dto),
      communicationPlan: this.generateCommunicationPlan(dto),
      qualityPlan: this.generateQualityPlan(dto),
      procurementPlan: this.generateProcurementPlan(dto),

      // Timeline and milestones
      projectTimeline: this.generateTimeline(dto),
      milestones: this.generateMilestones(dto),

      // Resource allocation
      resourceAllocation: this.generateResourceAllocation(dto),
      costEstimate: this.generateCostEstimate(dto),

      // Quality and risk management
      qualityMetrics: this.generateQualityMetrics(dto),
      riskMitigationStrategies: this.generateRiskMitigationStrategies(dto),

      // Stakeholder management
      stakeholderEngagementPlan: this.generateStakeholderEngagementPlan(dto),
      communicationSchedule: this.generateCommunicationSchedule(dto),
    };

    return plan;
  }

  private generatePlanRecommendations(dto: GeneratePlanDto): string[] {
    const recommendations: string[] = [];

    if (dto.complexity === 'high') {
      recommendations.push('Consider breaking down into smaller sub-projects');
      recommendations.push('Implement robust risk management framework');
      recommendations.push('Establish clear escalation procedures');
    }

    if (dto.methodology === 'agile') {
      recommendations.push('Set up sprint planning and retrospectives');
      recommendations.push('Implement continuous integration practices');
      recommendations.push('Establish product backlog management');
    }

    if (dto.teamSize && dto.teamSize > 10) {
      recommendations.push(
        'Consider team structure and communication channels',
      );
      recommendations.push('Implement regular team building activities');
      recommendations.push('Establish clear roles and responsibilities');
    }

    return recommendations;
  }

  private generateNextSteps(dto: GeneratePlanDto): string[] {
    return [
      'Review and approve project plan',
      'Set up project governance structure',
      'Establish communication channels',
      'Begin stakeholder engagement',
      'Start project execution',
    ];
  }

  private async generateAutomatedReport(
    dto: ProgressReportDto,
    userId: string,
  ): Promise<any> {
    const report = {
      reportType: dto.reportType || 'weekly',
      generatedAt: new Date(),
      projectMetrics: await this.calculateProjectMetrics(dto.projectId),
      progressSummary: await this.generateProgressSummary(dto.projectId),
      issuesAndRisks: await this.identifyIssuesAndRisks(dto.projectId),
      nextPeriodPlan: await this.generateNextPeriodPlan(dto.projectId),
      recommendations: await this.generateReportRecommendations(dto),
    };

    return report;
  }

  private calculateReportMetrics(dto: ProgressReportDto): any {
    return {
      schedulePerformance: 85,
      costPerformance: 92,
      qualityMetrics: 88,
      riskExposure: 15,
      stakeholderSatisfaction: 90,
    };
  }

  private generateReportRecommendations(dto: ProgressReportDto): string[] {
    return [
      'Accelerate critical path activities',
      'Implement additional quality checks',
      'Enhance stakeholder communication',
      'Review and update risk mitigation strategies',
    ];
  }

  private async getSmartRecommendations(
    dto: NextActionsDto,
    userId: string,
  ): Promise<any[]> {
    const actions = [
      {
        action: 'Schedule stakeholder review meeting',
        priority: 'high',
        effort: '2 hours',
        impact: 'high',
        dependencies: [],
      },
      {
        action: 'Update project schedule',
        priority: 'medium',
        effort: '1 hour',
        impact: 'medium',
        dependencies: ['stakeholder approval'],
      },
      {
        action: 'Conduct risk assessment',
        priority: 'high',
        effort: '4 hours',
        impact: 'high',
        dependencies: [],
      },
    ];

    return actions;
  }

  private estimateActionEffort(actions: any[]): any {
    const totalEffort = actions.reduce((sum, action) => {
      const hours = parseInt(action.effort.split(' ')[0]);
      return sum + hours;
    }, 0);

    return {
      totalHours: totalEffort,
      estimatedDays: Math.ceil(totalEffort / 8),
      resourceRequirements: this.calculateResourceRequirements(actions),
    };
  }

  private async getDomainKnowledge(domain: string): Promise<any[]> {
    // This would fetch from the PM knowledge database
    return [
      {
        title: `${domain} Best Practices`,
        content: `Comprehensive guide for ${domain} management`,
        source: 'PMI Knowledge Base',
        confidence: 0.95,
      },
    ];
  }

  private getBestPractices(domain: string): string[] {
    return [
      'Establish clear objectives and success criteria',
      'Implement regular progress monitoring',
      'Maintain stakeholder engagement',
      'Document lessons learned',
    ];
  }

  private getMethodologies(domain: string): string[] {
    return ['predictive', 'agile', 'hybrid', 'universal'];
  }

  private async getTemplatesByType(type: string): Promise<any[]> {
    const templates = {
      'project-plan': [
        'Comprehensive Project Plan Template',
        'Agile Project Plan Template',
        'Simple Project Plan Template',
      ],
      'risk-register': [
        'Detailed Risk Register Template',
        'Simple Risk Register Template',
        'Agile Risk Register Template',
      ],
      'stakeholder-register': [
        'Stakeholder Analysis Template',
        'Stakeholder Engagement Plan Template',
        'Communication Plan Template',
      ],
      'progress-report': [
        'Weekly Status Report Template',
        'Monthly Executive Summary Template',
        'Project Dashboard Template',
      ],
    };

    return templates[type] || [];
  }

  private getCustomizationOptions(type: string): any {
    return {
      'project-plan': ['methodology', 'complexity', 'team-size', 'timeline'],
      'risk-register': [
        'risk-categories',
        'probability-scales',
        'impact-scales',
      ],
      'stakeholder-register': [
        'stakeholder-types',
        'influence-levels',
        'communication-preferences',
      ],
      'progress-report': ['metrics', 'frequency', 'audience'],
    };
  }

  // Plan generation helper methods
  private generateWBS(dto: GeneratePlanDto): any {
    return {
      level1: 'Project',
      level2: ['Planning', 'Execution', 'Monitoring', 'Closing'],
      level3: this.generateDetailedWBS(dto),
    };
  }

  private generateRiskRegister(dto: GeneratePlanDto): any[] {
    return [
      {
        risk: 'Scope creep',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Regular scope reviews',
        owner: 'Project Manager',
      },
      {
        risk: 'Resource constraints',
        probability: 'high',
        impact: 'medium',
        mitigation: 'Resource leveling',
        owner: 'Resource Manager',
      },
    ];
  }

  private generateStakeholderRegister(dto: GeneratePlanDto): any[] {
    return [
      {
        name: 'Project Sponsor',
        role: 'Executive Sponsor',
        influence: 'high',
        interest: 'high',
        communicationPreference: 'Executive summary',
      },
      {
        name: 'Project Manager',
        role: 'Project Lead',
        influence: 'high',
        interest: 'high',
        communicationPreference: 'Detailed reports',
      },
    ];
  }

  private generateCommunicationPlan(dto: GeneratePlanDto): any {
    return {
      stakeholders: this.generateStakeholderRegister(dto),
      communicationSchedule: this.generateCommunicationSchedule(dto),
      escalationProcedures: this.generateEscalationProcedures(dto),
    };
  }

  private generateQualityPlan(dto: GeneratePlanDto): any {
    return {
      qualityObjectives: [
        'Meet stakeholder requirements',
        'Achieve project goals',
      ],
      qualityMetrics: [
        'Customer satisfaction',
        'Defect rate',
        'Timeline adherence',
      ],
      qualityAssurance: [
        'Regular reviews',
        'Testing procedures',
        'Documentation standards',
      ],
    };
  }

  private generateProcurementPlan(dto: GeneratePlanDto): any {
    return {
      procurementNeeds: [
        'External consultants',
        'Software licenses',
        'Hardware',
      ],
      procurementSchedule: this.generateProcurementSchedule(dto),
      vendorManagement: this.generateVendorManagementPlan(dto),
    };
  }

  private generateTimeline(dto: GeneratePlanDto): any {
    return {
      phases: ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closing'],
      duration: dto.timeline || '6 months',
      milestones: this.generateMilestones(dto),
    };
  }

  private generateMilestones(dto: GeneratePlanDto): any[] {
    return [
      { name: 'Project Kickoff', date: 'Week 1' },
      { name: 'Planning Complete', date: 'Week 4' },
      { name: 'Execution Start', date: 'Week 5' },
      { name: 'Project Complete', date: 'Week 24' },
    ];
  }

  private generateResourceAllocation(dto: GeneratePlanDto): any {
    return {
      teamSize: dto.teamSize || 5,
      roles: ['Project Manager', 'Team Lead', 'Developers', 'QA Engineer'],
      budget: dto.budget,
      timeline: dto.timeline,
    };
  }

  private generateCostEstimate(dto: GeneratePlanDto): any {
    const budget = dto.budget || 0;
    return {
      laborCosts: budget * 0.7,
      materialCosts: budget * 0.2,
      overheadCosts: budget * 0.1,
      contingency: budget * 0.1,
    };
  }

  private generateQualityMetrics(dto: GeneratePlanDto): any {
    return {
      customerSatisfaction: 'Target: 90%',
      defectRate: 'Target: <5%',
      timelineAdherence: 'Target: 95%',
      budgetAdherence: 'Target: 100%',
    };
  }

  private generateRiskMitigationStrategies(dto: GeneratePlanDto): any[] {
    return [
      'Regular risk reviews',
      'Contingency planning',
      'Stakeholder engagement',
      'Quality assurance procedures',
    ];
  }

  private generateStakeholderEngagementPlan(dto: GeneratePlanDto): any {
    return {
      engagementStrategies: [
        'Regular updates',
        'Stakeholder meetings',
        'Feedback collection',
      ],
      communicationChannels: ['Email', 'Meetings', 'Reports', 'Dashboard'],
      engagementSchedule: this.generateEngagementSchedule(dto),
    };
  }

  private generateCommunicationSchedule(dto: GeneratePlanDto): any {
    return {
      weeklyUpdates: 'Every Monday',
      monthlyReviews: 'First Monday of month',
      milestoneCommunications: 'As milestones are achieved',
      escalationProcedures: 'Immediate for critical issues',
    };
  }

  private generateDetailedWBS(dto: GeneratePlanDto): any {
    return {
      planning: ['Requirements gathering', 'Design', 'Planning'],
      execution: ['Development', 'Testing', 'Integration'],
      monitoring: ['Progress tracking', 'Quality control', 'Risk management'],
      closing: ['Documentation', 'Handover', 'Lessons learned'],
    };
  }

  private generateProcurementSchedule(dto: GeneratePlanDto): any {
    return {
      phase1: 'Requirements and specifications',
      phase2: 'Vendor selection',
      phase3: 'Contract negotiation',
      phase4: 'Delivery and acceptance',
    };
  }

  private generateVendorManagementPlan(dto: GeneratePlanDto): any {
    return {
      vendorSelection: 'Competitive bidding process',
      contractManagement: 'Regular performance reviews',
      relationshipManagement: 'Regular communication and feedback',
    };
  }

  private generateEscalationProcedures(dto: GeneratePlanDto): any {
    return {
      level1: 'Project Manager',
      level2: 'Program Manager',
      level3: 'Executive Sponsor',
      level4: 'Steering Committee',
    };
  }

  private generateEngagementSchedule(dto: GeneratePlanDto): any {
    return {
      weekly: 'Team meetings and updates',
      monthly: 'Stakeholder reviews',
      quarterly: 'Executive reviews',
      asNeeded: 'Issue escalation and resolution',
    };
  }

  private calculateResourceRequirements(actions: any[]): any {
    return {
      projectManager: 'Full-time',
      teamMembers: 'As needed',
      stakeholders: 'Part-time',
      externalConsultants: 'As required',
    };
  }

  private async calculateProjectMetrics(projectId: string): Promise<any> {
    return {
      schedulePerformance: 85,
      costPerformance: 92,
      qualityMetrics: 88,
      riskExposure: 15,
    };
  }

  private async generateProgressSummary(projectId: string): Promise<any> {
    return {
      completedTasks: 15,
      totalTasks: 20,
      completionRate: 75,
      onTrack: true,
    };
  }

  private async identifyIssuesAndRisks(projectId: string): Promise<any> {
    return {
      issues: ['Resource constraints', 'Schedule delays'],
      risks: ['Scope creep', 'Budget overrun'],
      mitigationActions: ['Resource reallocation', 'Schedule optimization'],
    };
  }

  private async generateNextPeriodPlan(projectId: string): Promise<any> {
    return {
      upcomingMilestones: ['Phase 2 completion', 'Stakeholder review'],
      resourceNeeds: ['Additional developers', 'QA resources'],
      riskMitigation: ['Enhanced monitoring', 'Stakeholder engagement'],
    };
  }
}
