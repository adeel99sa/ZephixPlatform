import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PMKnowledgeChunk } from '../entities/pm-knowledge-chunk.entity';
import { UserProject } from '../entities/user-project.entity';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectRisk } from '../entities/project-risk.entity';
import { ProjectStakeholder } from '../entities/project-stakeholder.entity';

export interface ProjectContext {
  projectId?: string;
  portfolioId?: string;
  programId?: string;
  methodology?: string;
  domain?: string;
  processGroup?: string;
}

export interface PMResponse {
  answer: string;
  confidence: number;
  sources: string[];
  recommendations: string[];
  nextActions: string[];
}

export interface ProjectHealthReport {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  scheduleHealth: number;
  budgetHealth: number;
  qualityHealth: number;
  riskHealth: number;
  stakeholderHealth: number;
  issues: string[];
  recommendations: string[];
}

export interface PortfolioRecommendations {
  resourceAllocation: Record<string, any>;
  riskMitigation: string[];
  scheduleOptimization: string[];
  budgetOptimization: string[];
  priorityAdjustments: string[];
}

export interface RiskPredictions {
  highRiskItems: string[];
  mediumRiskItems: string[];
  earlyWarningSignals: string[];
  mitigationStrategies: string[];
  probabilityScores: Record<string, number>;
}

export interface CommunicationPlan {
  stakeholderUpdates: Record<string, any>;
  communicationSchedule: Record<string, any>;
  escalationProcedures: string[];
  reportingTemplates: string[];
}

@Injectable()
export class AIPMAssistantService {
  private readonly logger = new Logger(AIPMAssistantService.name);

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
  ) {}

  async askPMQuestion(
    question: string,
    context?: ProjectContext,
  ): Promise<PMResponse> {
    this.logger.log(`Processing PM question: ${question}`);

    try {
      // Get relevant knowledge chunks based on question and context
      const knowledgeChunks = await this.getRelevantKnowledge(
        question,
        context,
      );

      // Generate comprehensive response using AI
      const response = await this.generatePMResponse(
        question,
        knowledgeChunks,
        context,
      );

      return response;
    } catch (error) {
      this.logger.error('Error processing PM question:', error);
      throw error;
    }
  }

  async analyzeProjectHealth(projectId: string, organizationId: string): Promise<ProjectHealthReport> {
    this.logger.log(`Analyzing project health for project: ${projectId}`);

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId, organizationId },
        relations: ['tasks', 'risks', 'stakeholders'],
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Calculate health metrics
      const scheduleHealth = this.calculateScheduleHealth(project);
      const budgetHealth = this.calculateBudgetHealth(project);
      const qualityHealth = this.calculateQualityHealth(project);
      const riskHealth = this.calculateRiskHealth(project);
      const stakeholderHealth = this.calculateStakeholderHealth(project);

      // Determine overall health
      const overallHealth = this.determineOverallHealth([
        scheduleHealth,
        budgetHealth,
        qualityHealth,
        riskHealth,
        stakeholderHealth,
      ]);

      // Generate recommendations
      const recommendations = await this.generateHealthRecommendations(
        project,
        {
          scheduleHealth,
          budgetHealth,
          qualityHealth,
          riskHealth,
          stakeholderHealth,
        },
      );

      return {
        overallHealth,
        scheduleHealth,
        budgetHealth,
        qualityHealth,
        riskHealth,
        stakeholderHealth,
        issues: this.identifyIssues(project),
        recommendations,
      };
    } catch (error) {
      this.logger.error('Error analyzing project health:', error);
      throw error;
    }
  }

  async optimizePortfolio(
    portfolioId: string,
    organizationId: string,
  ): Promise<PortfolioRecommendations> {
    this.logger.log(`Optimizing portfolio: ${portfolioId}`);

    try {
      const projects = await this.projectRepository.find({
        where: { portfolioId, organizationId },
        relations: ['tasks', 'risks', 'stakeholders'],
      });

      // Analyze portfolio-level metrics
      const resourceAllocation = this.analyzeResourceAllocation(projects);
      const riskMitigation = this.identifyPortfolioRisks(projects);
      const scheduleOptimization = this.optimizePortfolioSchedule(projects);
      const budgetOptimization = this.optimizePortfolioBudget(projects);
      const priorityAdjustments = this.suggestPriorityAdjustments(projects);

      return {
        resourceAllocation,
        riskMitigation,
        scheduleOptimization,
        budgetOptimization,
        priorityAdjustments,
      };
    } catch (error) {
      this.logger.error('Error optimizing portfolio:', error);
      throw error;
    }
  }

  async predictProjectRisks(projectData: any): Promise<RiskPredictions> {
    this.logger.log('Predicting project risks');

    try {
      // Analyze project characteristics
      const riskFactors = this.analyzeRiskFactors(projectData);

      // Use AI to predict risks based on patterns
      const predictions = await this.generateRiskPredictions(
        projectData,
        riskFactors,
      );

      return predictions;
    } catch (error) {
      this.logger.error('Error predicting project risks:', error);
      throw error;
    }
  }

  async generateStakeholderUpdates(
    projectId: string,
    organizationId: string,
  ): Promise<CommunicationPlan> {
    this.logger.log(`Generating stakeholder updates for project: ${projectId}`);

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId, organizationId },
        relations: ['stakeholders', 'tasks', 'risks'],
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Generate personalized updates for each stakeholder
      const stakeholderUpdates =
        await this.generatePersonalizedUpdates(project);

      // Create communication schedule
      const communicationSchedule = this.createCommunicationSchedule(project);

      // Define escalation procedures
      const escalationProcedures = this.defineEscalationProcedures(project);

      // Generate reporting templates
      const reportingTemplates = this.generateReportingTemplates(project);

      return {
        stakeholderUpdates,
        communicationSchedule,
        escalationProcedures,
        reportingTemplates,
      };
    } catch (error) {
      this.logger.error('Error generating stakeholder updates:', error);
      throw error;
    }
  }

  private async getRelevantKnowledge(
    question: string,
    context?: ProjectContext,
  ): Promise<PMKnowledgeChunk[]> {
    // This would integrate with OpenAI embeddings for semantic search
    // For now, return relevant chunks based on keywords
    const query = this.pmKnowledgeRepository.createQueryBuilder('chunk');

    if (context?.domain) {
      query.andWhere('chunk.domain = :domain', { domain: context.domain });
    }

    if (context?.methodology) {
      query.andWhere('chunk.methodology = :methodology', {
        methodology: context.methodology,
      });
    }

    return query.limit(10).getMany();
  }

  private async generatePMResponse(
    question: string,
    knowledgeChunks: PMKnowledgeChunk[],
    context?: ProjectContext,
  ): Promise<PMResponse> {
    // This would integrate with Claude API for intelligent responses
    // For now, return a structured response based on knowledge chunks

    const answer = `Based on PMI best practices and the provided context, here's my analysis: ${question}`;
    const confidence = 0.85;
    const sources = knowledgeChunks.map((chunk) => chunk.source);
    const recommendations = [
      'Implement regular status reviews',
      'Establish clear communication channels',
    ];
    const nextActions = ['Schedule stakeholder meeting', 'Update project plan'];

    return {
      answer,
      confidence,
      sources,
      recommendations,
      nextActions,
    };
  }

  private calculateScheduleHealth(project: UserProject): number {
    // Calculate schedule performance index
    const tasks = project.tasks || [];
    const completedTasks = tasks.filter(
      (task) => task.status === 'completed',
    ).length;
    const totalTasks = tasks.length;

    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  }

  private calculateBudgetHealth(project: UserProject): number {
    // Calculate cost performance index
    const tasks = project.tasks || [];
    const estimatedHours = tasks.reduce(
      (sum, task) => sum + (task.estimatedHours || 0),
      0,
    );
    const actualHours = tasks.reduce(
      (sum, task) => sum + (task.actualHours || 0),
      0,
    );

    return estimatedHours > 0
      ? Math.min(100, (estimatedHours / actualHours) * 100)
      : 100;
  }

  private calculateQualityHealth(project: UserProject): number {
    // Calculate quality metrics based on task completion and stakeholder satisfaction
    const tasks = project.tasks || [];
    const completedTasks = tasks.filter(
      (task) => task.status === 'completed',
    ).length;
    const totalTasks = tasks.length;

    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  }

  private calculateRiskHealth(project: UserProject): number {
    // Calculate risk health based on risk scores and mitigation status
    const risks = project.risks || [];
    const highRisks = risks.filter(
      (risk) => risk.riskScore && risk.riskScore > 7,
    ).length;
    const mitigatedRisks = risks.filter(
      (risk) => risk.status === 'mitigated',
    ).length;
    const totalRisks = risks.length;

    if (totalRisks === 0) return 100;

    const riskScore = ((totalRisks - highRisks) / totalRisks) * 100;
    const mitigationScore = (mitigatedRisks / totalRisks) * 100;

    return (riskScore + mitigationScore) / 2;
  }

  private calculateStakeholderHealth(project: UserProject): number {
    // Calculate stakeholder satisfaction and engagement
    const stakeholders = project.stakeholders || [];
    const highInfluenceStakeholders = stakeholders.filter(
      (s) => s.influence === 'high',
    ).length;
    const engagedStakeholders = stakeholders.filter(
      (s) => s.engagementStrategy,
    ).length;
    const totalStakeholders = stakeholders.length;

    if (totalStakeholders === 0) return 100;

    return (engagedStakeholders / totalStakeholders) * 100;
  }

  private determineOverallHealth(
    healthScores: number[],
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const averageHealth =
      healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;

    if (averageHealth >= 90) return 'excellent';
    if (averageHealth >= 75) return 'good';
    if (averageHealth >= 60) return 'fair';
    if (averageHealth >= 40) return 'poor';
    return 'critical';
  }

  private identifyIssues(project: UserProject): string[] {
    const issues: string[] = [];

    // Check for schedule issues
    const overdueTasks =
      project.tasks?.filter(
        (task) =>
          task.dueDate &&
          new Date(task.dueDate) < new Date() &&
          task.status !== 'completed',
      ) || [];

    if (overdueTasks.length > 0) {
      issues.push(`${overdueTasks.length} tasks are overdue`);
    }

    // Check for risk issues
    const highRisks =
      project.risks?.filter((risk) => risk.riskScore && risk.riskScore > 7) ||
      [];
    if (highRisks.length > 0) {
      issues.push(`${highRisks.length} high-risk items need attention`);
    }

    return issues;
  }

  private async generateHealthRecommendations(
    project: UserProject,
    healthScores: any,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (healthScores.scheduleHealth < 75) {
      recommendations.push('Implement daily stand-ups to track progress');
      recommendations.push('Review and update project schedule weekly');
    }

    if (healthScores.budgetHealth < 75) {
      recommendations.push('Conduct weekly budget reviews');
      recommendations.push('Implement cost control measures');
    }

    if (healthScores.riskHealth < 75) {
      recommendations.push('Develop risk mitigation strategies');
      recommendations.push('Schedule regular risk review meetings');
    }

    return recommendations;
  }

  private analyzeResourceAllocation(
    projects: UserProject[],
  ): Record<string, any> {
    // Analyze resource allocation across projects
    const resourceAnalysis = {
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalTasks: projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0),
      resourceUtilization: this.calculateResourceUtilization(projects),
      recommendations: this.generateResourceRecommendations(projects),
    };

    return resourceAnalysis;
  }

  private identifyPortfolioRisks(projects: UserProject[]): string[] {
    const portfolioRisks: string[] = [];

    // Identify cross-project risks
    const highRiskProjects = projects.filter((p) =>
      p.risks?.some((r) => r.riskScore && r.riskScore > 7),
    );

    if (highRiskProjects.length > 0) {
      portfolioRisks.push(
        `Monitor ${highRiskProjects.length} high-risk projects closely`,
      );
    }

    // Resource conflicts
    const resourceConflicts = this.identifyResourceConflicts(projects);
    if (resourceConflicts.length > 0) {
      portfolioRisks.push(...resourceConflicts);
    }

    return portfolioRisks;
  }

  private optimizePortfolioSchedule(projects: UserProject[]): string[] {
    const optimizations: string[] = [];

    // Identify schedule conflicts
    const scheduleConflicts = this.identifyScheduleConflicts(projects);
    if (scheduleConflicts.length > 0) {
      optimizations.push(...scheduleConflicts);
    }

    // Suggest schedule optimizations
    optimizations.push('Implement staggered project start dates');
    optimizations.push('Establish shared milestone calendar');

    return optimizations;
  }

  private optimizePortfolioBudget(projects: UserProject[]): string[] {
    const optimizations: string[] = [];

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const budgetUtilization = this.calculateBudgetUtilization(projects);

    if (budgetUtilization > 90) {
      optimizations.push('Consider budget reallocation across projects');
    }

    optimizations.push('Implement monthly budget reviews');
    optimizations.push('Establish contingency fund');

    return optimizations;
  }

  private suggestPriorityAdjustments(projects: UserProject[]): string[] {
    const adjustments: string[] = [];

    // Analyze project priorities based on business value and risk
    const priorityAnalysis = this.analyzeProjectPriorities(projects);

    if (priorityAnalysis.needsReprioritization) {
      adjustments.push('Reassess project priorities based on business value');
      adjustments.push('Consider delaying low-priority, high-risk projects');
    }

    return adjustments;
  }

  private analyzeRiskFactors(projectData: any): any {
    // Analyze project characteristics for risk prediction
    return {
      complexity: this.assessComplexity(projectData),
      teamExperience: this.assessTeamExperience(projectData),
      stakeholderInfluence: this.assessStakeholderInfluence(projectData),
      technologyRisk: this.assessTechnologyRisk(projectData),
    };
  }

  private async generateRiskPredictions(
    projectData: any,
    riskFactors: any,
  ): Promise<RiskPredictions> {
    // Use AI to predict risks based on patterns and factors
    const highRiskItems = this.identifyHighRiskItems(projectData, riskFactors);
    const mediumRiskItems = this.identifyMediumRiskItems(
      projectData,
      riskFactors,
    );
    const earlyWarningSignals = this.identifyEarlyWarningSignals(
      projectData,
      riskFactors,
    );
    const mitigationStrategies = this.generateMitigationStrategies(riskFactors);
    const probabilityScores = this.calculateProbabilityScores(
      projectData,
      riskFactors,
    );

    return {
      highRiskItems,
      mediumRiskItems,
      earlyWarningSignals,
      mitigationStrategies,
      probabilityScores,
    };
  }

  private async generatePersonalizedUpdates(
    project: UserProject,
  ): Promise<Record<string, any>> {
    const updates: Record<string, any> = {};

    for (const stakeholder of project.stakeholders || []) {
      updates[stakeholder.name] = {
        role: stakeholder.role,
        influence: stakeholder.influence,
        interest: stakeholder.interest,
        update: this.generateStakeholderSpecificUpdate(project, stakeholder),
        nextActions: this.generateStakeholderActions(project, stakeholder),
      };
    }

    return updates;
  }

  private createCommunicationSchedule(
    project: UserProject,
  ): Record<string, any> {
    return {
      weeklyUpdates: this.scheduleWeeklyUpdates(project),
      monthlyReviews: this.scheduleMonthlyReviews(project),
      milestoneCommunications: this.scheduleMilestoneCommunications(project),
      escalationProcedures: this.defineEscalationTimelines(project),
    };
  }

  private defineEscalationProcedures(project: UserProject): string[] {
    return [
      'Immediate escalation for critical issues',
      '24-hour response for high-priority items',
      'Weekly review for medium-priority items',
      'Monthly review for low-priority items',
    ];
  }

  private generateReportingTemplates(project: UserProject): string[] {
    return [
      'Weekly status report template',
      'Monthly executive summary template',
      'Risk assessment report template',
      'Stakeholder communication template',
    ];
  }

  // Helper methods for calculations and analysis
  private calculateResourceUtilization(projects: UserProject[]): number {
    // Calculate overall resource utilization across projects
    return 85; // Placeholder
  }

  private generateResourceRecommendations(projects: UserProject[]): string[] {
    return [
      'Implement resource sharing between projects',
      'Establish resource allocation guidelines',
      'Monitor resource conflicts regularly',
    ];
  }

  private identifyResourceConflicts(projects: UserProject[]): string[] {
    return [
      'Multiple projects competing for same resources',
      'Consider resource leveling across portfolio',
    ];
  }

  private identifyScheduleConflicts(projects: UserProject[]): string[] {
    return [
      'Overlapping project timelines detected',
      'Consider staggered project starts',
    ];
  }

  private calculateBudgetUtilization(projects: UserProject[]): number {
    return 75; // Placeholder
  }

  private analyzeProjectPriorities(projects: UserProject[]): any {
    return {
      needsReprioritization: true,
      recommendations: ['Reassess priorities based on business value'],
    };
  }

  private assessComplexity(projectData: any): number {
    return 7; // Placeholder complexity score
  }

  private assessTeamExperience(projectData: any): number {
    return 6; // Placeholder experience score
  }

  private assessStakeholderInfluence(projectData: any): number {
    return 8; // Placeholder influence score
  }

  private assessTechnologyRisk(projectData: any): number {
    return 5; // Placeholder technology risk score
  }

  private identifyHighRiskItems(projectData: any, riskFactors: any): string[] {
    return [
      'Technology integration complexity',
      'Stakeholder resistance to change',
      'Resource constraints',
    ];
  }

  private identifyMediumRiskItems(
    projectData: any,
    riskFactors: any,
  ): string[] {
    return [
      'Schedule dependencies',
      'Budget fluctuations',
      'Team availability',
    ];
  }

  private identifyEarlyWarningSignals(
    projectData: any,
    riskFactors: any,
  ): string[] {
    return [
      'Delayed milestone completions',
      'Increased stakeholder concerns',
      'Resource allocation conflicts',
    ];
  }

  private generateMitigationStrategies(riskFactors: any): string[] {
    return [
      'Implement regular risk reviews',
      'Establish contingency plans',
      'Enhance stakeholder communication',
    ];
  }

  private calculateProbabilityScores(
    projectData: any,
    riskFactors: any,
  ): Record<string, number> {
    return {
      'Technology Risk': 0.7,
      'Schedule Risk': 0.5,
      'Budget Risk': 0.4,
      'Stakeholder Risk': 0.6,
    };
  }

  private generateStakeholderSpecificUpdate(
    project: UserProject,
    stakeholder: ProjectStakeholder,
  ): string {
    return `Project ${project.name} is progressing well. Current status: ${project.status}. Key updates for ${stakeholder.role} role.`;
  }

  private generateStakeholderActions(
    project: UserProject,
    stakeholder: ProjectStakeholder,
  ): string[] {
    return [
      'Review project status',
      'Provide feedback on deliverables',
      'Attend stakeholder meeting',
    ];
  }

  private scheduleWeeklyUpdates(project: UserProject): any {
    return {
      frequency: 'Weekly',
      participants: project.stakeholders?.map((s) => s.name) || [],
      format: 'Status report with key metrics',
    };
  }

  private scheduleMonthlyReviews(project: UserProject): any {
    return {
      frequency: 'Monthly',
      participants:
        project.stakeholders
          ?.filter((s) => s.influence === 'high')
          .map((s) => s.name) || [],
      format: 'Executive summary with recommendations',
    };
  }

  private scheduleMilestoneCommunications(project: UserProject): any {
    return {
      trigger: 'Milestone completion',
      participants: 'All stakeholders',
      format: 'Milestone achievement notification',
    };
  }

  private defineEscalationTimelines(project: UserProject): any {
    return {
      critical: 'Immediate',
      high: '24 hours',
      medium: '1 week',
      low: '1 month',
    };
  }
}
