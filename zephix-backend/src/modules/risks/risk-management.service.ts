import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../modules/projects/entities/project.entity';
import { Risk } from '../entities/risk.entity';
import { RiskAssessment } from '../entities/risk-assessment.entity';
import { RiskResponse } from '../entities/risk-response.entity';
import { RiskMonitoring } from '../entities/risk-monitoring.entity';
import { ClaudeService } from '../../modules/ai-assistant/claude.service';

export interface RiskIdentificationInput {
  projectId: string;
  riskSources: {
    projectData: boolean;
    externalFactors: boolean;
    stakeholderFeedback: boolean;
    historicalData: boolean;
    industryTrends: boolean;
    marketConditions: boolean;
  };
  scanDepth: 'basic' | 'comprehensive' | 'deep-analysis';
  focusAreas?: string[];
}

export interface RiskData {
  id: string;
  title: string;
  description: string;
  category:
    | 'technical'
    | 'resource'
    | 'schedule'
    | 'budget'
    | 'scope'
    | 'quality'
    | 'external'
    | 'stakeholder'
    | 'regulatory'
    | 'market';
  subcategory?: string;
  probability: {
    score: number; // 1-5 scale
    confidence: number; // 0-100%
    rationale: string;
    evidencePoints: string[];
  };
  impact: {
    schedule: number; // 1-5 scale
    budget: number;
    scope: number;
    quality: number;
    overall: number;
    quantifiedImpact?: {
      scheduleDelayDays?: number;
      budgetImpactAmount?: number;
      scopeReductionPercent?: number;
      qualityImpactDescription?: string;
    };
  };
  riskScore: number; // Calculated: probability * impact
  riskLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  timing: {
    identificationDate: string;
    expectedOccurrence?: string;
    earliestImpact?: string;
    latestImpact?: string;
  };
  triggers: {
    warningSignals: string[];
    leadIndicators: string[];
    thresholds: Array<{
      metric: string;
      value: number;
      operator: 'greater-than' | 'less-than' | 'equals';
    }>;
  };
  dependencies: {
    relatedRisks: string[];
    affectedWorkPackages: string[];
    impactedStakeholders: string[];
  };
  source:
    | 'ai-identified'
    | 'manual-entry'
    | 'stakeholder-feedback'
    | 'historical-analysis'
    | 'external-scan';
  confidence: number;
}

export interface RiskResponsePlan {
  riskId: string;
  responseStrategy: 'avoid' | 'transfer' | 'mitigate' | 'accept';
  rationale: string;
  actions: Array<{
    id: string;
    description: string;
    type: 'preventive' | 'corrective' | 'contingent';
    owner: string;
    dueDate: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    estimatedCost?: number;
    estimatedEffort?: number;
    successCriteria: string[];
  }>;
  contingencyPlan?: {
    description: string;
    triggerConditions: string[];
    actions: string[];
    requiredResources: string[];
    estimatedCost: number;
  };
  transferDetails?: {
    method: 'insurance' | 'contract' | 'outsourcing' | 'partnership';
    provider: string;
    cost: number;
    coverage: string;
  };
  monitoring: {
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
    methods: string[];
    kpis: Array<{
      name: string;
      target: number;
      current?: number;
      trend?: 'improving' | 'stable' | 'deteriorating';
    }>;
    reportingStructure: string[];
  };
  effectiveness: {
    probabilityReduction?: number;
    impactReduction?: number;
    costBenefit: number;
    implementationComplexity: 'low' | 'medium' | 'high';
  };
}

export interface RiskAnalysisOutput {
  riskSummary: {
    totalRisks: number;
    newRisks: number;
    activeRisks: number;
    closedRisks: number;
    riskDistribution: {
      veryHigh: number;
      high: number;
      medium: number;
      low: number;
      veryLow: number;
    };
    categoryBreakdown: Record<string, number>;
  };
  topRisks: RiskData[];
  riskMatrix: {
    [key: string]: Array<{
      riskId: string;
      title: string;
      probability: number;
      impact: number;
    }>;
  };
  riskTrends: {
    riskVelocity: number; // New risks per week
    resolutionRate: number; // Risks closed per week
    escalationRate: number; // Risks moving to higher severity
    averageRiskAge: number; // Days
    trendDirection: 'improving' | 'stable' | 'deteriorating';
  };
  recommendations: {
    immediateActions: string[];
    strategicRecommendations: string[];
    processImprovements: string[];
    resourceNeeds: string[];
  };
  riskForecasting: {
    projectedRisks: Array<{
      category: string;
      likelihood: number;
      timeframe: string;
      description: string;
    }>;
    projectImpactForecast: {
      scheduleRisk: number;
      budgetRisk: number;
      scopeRisk: number;
      qualityRisk: number;
    };
    contingencyRecommendations: {
      scheduleBuffer: number;
      budgetReserve: number;
      resourceBackup: string[];
    };
  };
}

@Injectable()
export class RiskManagementService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(RiskAssessment)
    private riskAssessmentRepository: Repository<RiskAssessment>,
    @InjectRepository(RiskResponse)
    private riskResponseRepository: Repository<RiskResponse>,
    @InjectRepository(RiskMonitoring)
    private riskMonitoringRepository: Repository<RiskMonitoring>,
    private claudeService: ClaudeService,
  ) {}

  async performRiskAnalysis(
    input: RiskIdentificationInput,
    userId: string,
  ): Promise<RiskAnalysisOutput> {
    try {
      // Step 1: Comprehensive Risk Identification
      const identifiedRisks = await this.identifyRisks(input);

      // Step 2: Professional Risk Assessment
      const assessedRisks = await this.assessRisks(identifiedRisks, input);

      // Step 3: Risk Response Planning
      const responseStrategies =
        await this.generateResponseStrategies(assessedRisks);

      // Step 4: Risk Impact Forecasting
      const riskForecasting = await this.forecastRiskImpacts(
        assessedRisks,
        input.projectId,
      );

      // Step 5: Generate Analysis Output
      const analysisOutput = await this.generateRiskAnalysis(
        assessedRisks,
        responseStrategies,
        riskForecasting,
        input.projectId,
      );

      // Step 6: Persist Risk Data
      await this.persistRiskAnalysis(
        assessedRisks,
        responseStrategies,
        input.projectId,
        userId,
      );

      return analysisOutput;
    } catch (error) {
      throw new Error(`Risk analysis failed: ${error.message}`);
    }
  }

  private async identifyRisks(input: RiskIdentificationInput): Promise<any[]> {
    const project = await this.projectRepository.findOne({
      where: { id: input.projectId },
      relations: ['statusReports', 'stakeholders'],
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const prompt = `
    As an expert Risk Management Professional, perform comprehensive risk identification for this project:

    Project Data: ${JSON.stringify(project)}
    Risk Sources Configuration: ${JSON.stringify(input.riskSources)}
    Scan Depth: ${input.scanDepth}
    Focus Areas: ${JSON.stringify(input.focusAreas || [])}

    Perform intelligent risk identification across multiple dimensions:

    1. PROJECT-SPECIFIC RISKS:
    - Technical/Technology risks based on project complexity
    - Resource risks based on team structure and availability
    - Schedule risks based on timeline and dependencies
    - Budget risks based on financial constraints
    - Scope risks based on requirements clarity
    - Quality risks based on acceptance criteria

    2. EXTERNAL ENVIRONMENT RISKS:
    - Market condition changes
    - Regulatory/compliance changes
    - Vendor/supplier risks
    - Economic factors
    - Competitive landscape shifts
    - Technology evolution impacts

    3. STAKEHOLDER & ORGANIZATIONAL RISKS:
    - Stakeholder engagement and support
    - Organizational priority changes
    - Resource allocation conflicts
    - Communication breakdown
    - Decision-making delays
    - Change resistance

    4. EMERGING RISKS (AI-POWERED ANALYSIS):
    - Pattern analysis from similar projects
    - Early warning indicators from current data
    - Trend analysis suggesting future risks
    - Correlation analysis identifying hidden risks

    For each identified risk, provide:
    - Clear, specific risk description
    - Category and subcategory classification
    - Source of identification
    - Initial probability assessment (1-5 scale)
    - Potential impact areas (schedule, budget, scope, quality)
    - Warning signals and lead indicators
    - Related dependencies

    Apply professional risk management methodologies (PMI standards).
    Focus on actionable, specific risks rather than generic categories.
    Include both immediate and future-looking risks.

    Format as comprehensive JSON array of risk objects.
    `;

    return await this.claudeService.analyze(prompt);
  }

  private async assessRisks(
    risks: any[],
    input: RiskIdentificationInput,
  ): Promise<RiskData[]> {
    const prompt = `
    Perform professional risk assessment on the following identified risks:

    Risks: ${JSON.stringify(risks)}
    Project Context: ${input.projectId}

    For each risk, provide comprehensive professional assessment:

    1. PROBABILITY ASSESSMENT (1-5 scale):
    - Analyze likelihood based on evidence
    - Consider historical data and patterns
    - Assess current project conditions
    - Provide confidence level (0-100%)
    - Document rationale and evidence points

    2. IMPACT ASSESSMENT (1-5 scale for each area):
    - Schedule impact: Days of delay potential
    - Budget impact: Cost impact assessment
    - Scope impact: Feature/deliverable risks
    - Quality impact: Quality degradation potential
    - Overall impact: Weighted combined score

    3. QUANTIFIED IMPACT ANALYSIS:
    - Specific schedule delay estimates (days)
    - Budget impact amounts (dollars/percentage)
    - Scope reduction potential (percentage)
    - Quality impact descriptions

    4. RISK SCORING & CLASSIFICATION:
    - Calculate risk score (probability × impact)
    - Assign risk level (very-low to very-high)
    - Provide confidence in assessment

    5. TRIGGER CONDITIONS:
    - Warning signals to monitor
    - Lead indicators for early detection
    - Specific thresholds and metrics
    - Monitoring frequency recommendations

    6. DEPENDENCIES & RELATIONSHIPS:
    - Related risks and correlations
    - Affected work packages
    - Impacted stakeholders
    - Cascade effect analysis

    Use professional risk assessment methodologies.
    Provide specific, quantified assessments where possible.
    Include confidence levels for all assessments.

    Format as JSON array matching the RiskData interface.
    `;

    return await this.claudeService.analyze(prompt);
  }

  private async generateResponseStrategies(
    risks: RiskData[],
  ): Promise<RiskResponsePlan[]> {
    const prompt = `
    Generate professional risk response strategies for these assessed risks:

    Risks: ${JSON.stringify(risks)}

    For each risk, develop comprehensive response planning:

    1. RESPONSE STRATEGY SELECTION:
    - Avoid: Eliminate the risk entirely
    - Transfer: Shift risk to third party
    - Mitigate: Reduce probability/impact
    - Accept: Acknowledge and monitor

    2. DETAILED ACTION PLANNING:
    - Specific preventive actions
    - Corrective measures if risk occurs
    - Contingency plans for worst-case scenarios
    - Resource requirements and costs
    - Success criteria and metrics

    3. RISK MITIGATION ACTIONS:
    - Preventive actions to reduce probability
    - Impact reduction measures
    - Timeline and responsibility assignment
    - Cost-benefit analysis
    - Implementation complexity assessment

    4. CONTINGENCY PLANNING:
    - Trigger conditions for activation
    - Specific response actions
    - Required resources and budget
    - Decision authority and escalation

    5. MONITORING & CONTROL:
    - Monitoring frequency and methods
    - Key performance indicators
    - Reporting structure and stakeholders
    - Effectiveness measurement

    6. RISK TRANSFER OPTIONS:
    - Insurance coverage possibilities
    - Contractual risk transfer
    - Outsourcing/partnership options
    - Cost-benefit analysis

    Apply professional risk response methodologies.
    Ensure response strategies are proportional to risk level.
    Consider organizational capabilities and constraints.
    Provide specific, actionable plans with clear ownership.

    Format as JSON array matching the RiskResponsePlan interface.
    `;

    return await this.claudeService.analyze(prompt);
  }

  private async forecastRiskImpacts(
    risks: RiskData[],
    projectId: string,
  ): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['statusReports'],
    });

    const prompt = `
    Generate risk impact forecasting and predictive analytics:

    Current Risks: ${JSON.stringify(risks)}
    Project Context: ${JSON.stringify(project)}

    Provide comprehensive risk forecasting:

    1. EMERGING RISK PROJECTION:
    - Likely future risks based on current trends
    - Timeline for potential risk emergence
    - Probability assessments for projected risks
    - Category-based risk evolution patterns

    2. PROJECT IMPACT FORECASTING:
    - Cumulative schedule risk assessment
    - Total budget risk exposure
    - Scope delivery confidence levels
    - Quality assurance risk factors

    3. CONTINGENCY RECOMMENDATIONS:
    - Recommended schedule buffer (days/percentage)
    - Suggested budget reserve (amount/percentage)
    - Resource backup requirements
    - Critical path protection strategies

    4. RISK VELOCITY ANALYSIS:
    - Rate of new risk identification
    - Risk resolution effectiveness
    - Risk escalation patterns
    - Average risk lifecycle duration

    5. SCENARIO PLANNING:
    - Best case scenario (low risk materialization)
    - Most likely scenario (expected risk impacts)
    - Worst case scenario (high risk materialization)
    - Confidence intervals for each scenario

    6. STRATEGIC RECOMMENDATIONS:
    - Risk management process improvements
    - Early warning system enhancements
    - Resource allocation adjustments
    - Stakeholder communication strategies

    Use predictive analytics and professional forecasting methods.
    Provide quantified projections with confidence levels.
    Consider risk correlation and cascade effects.

    Format as comprehensive JSON matching forecasting structure.
    `;

    return await this.claudeService.analyze(prompt);
  }

  private async generateRiskAnalysis(
    risks: RiskData[],
    responses: RiskResponsePlan[],
    forecasting: any,
    projectId: string,
  ): Promise<RiskAnalysisOutput> {
    // Calculate risk distribution
    const riskDistribution = risks.reduce(
      (acc, risk) => {
        acc[risk.riskLevel] = (acc[risk.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate category breakdown
    const categoryBreakdown = risks.reduce(
      (acc, risk) => {
        acc[risk.category] = (acc[risk.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Create risk matrix
    const riskMatrix = this.createRiskMatrix(risks);

    // Get top risks (highest risk scores)
    const topRisks = risks
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Calculate trends (this would use historical data in real implementation)
    const riskTrends = {
      riskVelocity: 2.5,
      resolutionRate: 1.8,
      escalationRate: 0.3,
      averageRiskAge: 14,
      trendDirection: 'stable' as const,
    };

    const prompt = `
    Generate strategic risk management recommendations based on complete risk analysis:

    Risk Summary: ${JSON.stringify({ risks: risks.length, distribution: riskDistribution })}
    Top Risks: ${JSON.stringify(topRisks.slice(0, 5))}
    Response Strategies: ${JSON.stringify(responses.slice(0, 3))}
    Forecasting: ${JSON.stringify(forecasting)}

    Provide executive-level recommendations:

    1. IMMEDIATE ACTIONS REQUIRED:
    - Critical risks requiring immediate attention
    - Actions that can be taken this week
    - Resources needed for immediate response

    2. STRATEGIC RECOMMENDATIONS:
    - Long-term risk management improvements
    - Process and methodology enhancements
    - Organizational capability development

    3. PROCESS IMPROVEMENTS:
    - Risk identification process enhancements
    - Assessment methodology improvements
    - Monitoring and reporting optimizations

    4. RESOURCE REQUIREMENTS:
    - Additional resources needed for risk management
    - Skills and expertise gaps to address
    - Technology and tool requirements

    Format as actionable recommendations with priorities and timelines.
    `;

    const recommendations = await this.claudeService.analyze(prompt);

    return {
      riskSummary: {
        totalRisks: risks.length,
        newRisks: risks.filter((r) => r.source === 'ai-identified').length,
        activeRisks: risks.filter((r) => r.riskLevel !== 'very-low').length,
        closedRisks: 0, // Would come from historical data
        riskDistribution: {
          veryHigh: riskDistribution['very-high'] || 0,
          high: riskDistribution['high'] || 0,
          medium: riskDistribution['medium'] || 0,
          low: riskDistribution['low'] || 0,
          veryLow: riskDistribution['very-low'] || 0,
        },
        categoryBreakdown,
      },
      topRisks,
      riskMatrix,
      riskTrends,
      recommendations,
      riskForecasting: forecasting,
    };
  }

  private createRiskMatrix(risks: RiskData[]): Record<string, any[]> {
    const matrix: Record<string, any[]> = {};

    risks.forEach((risk) => {
      const key = `${risk.probability.score}-${risk.impact.overall}`;
      if (!matrix[key]) {
        matrix[key] = [];
      }
      matrix[key].push({
        riskId: risk.id,
        title: risk.title,
        probability: risk.probability.score,
        impact: risk.impact.overall,
      });
    });

    return matrix;
  }

  private async persistRiskAnalysis(
    risks: RiskData[],
    responses: RiskResponsePlan[],
    projectId: string,
    userId: string,
  ): Promise<void> {
    // Save risks to database
    for (const riskData of risks) {
      const risk = this.riskRepository.create({
        projectId,
        title: riskData.title,
        description: riskData.description,
        category: riskData.category,
        subcategory: riskData.subcategory,
        probability: riskData.probability.score,
        impact: riskData.impact.overall,
        impactBreakdown: {
          schedule: riskData.impact.schedule,
          budget: riskData.impact.budget,
          scope: riskData.impact.scope,
          quality: riskData.impact.quality,
        },
        riskScore: riskData.riskScore,
        riskLevel: riskData.riskLevel,
        status: 'identified',
        triggers: riskData.triggers,
        dependencies: riskData.dependencies,
        source: riskData.source,
        confidence: riskData.confidence,
        probabilityRationale: riskData.probability.rationale,
        evidencePoints: riskData.probability.evidencePoints,
        riskData: {
          originalAssessment: riskData,
          aiAnalysis: null,
          historicalContext: null,
          externalFactors: null,
        },
        createdBy: userId,
      });

      const savedRisk = await this.riskRepository.save(risk);

      // Save response plan if exists
      const responseForRisk = responses.find((r) => r.riskId === riskData.id);
      if (responseForRisk) {
        const riskResponse = this.riskResponseRepository.create({
          riskId: savedRisk.id,
          strategy: responseForRisk.responseStrategy,
          rationale: responseForRisk.rationale,
          description: '',
          actions: responseForRisk.actions,
          contingencyPlan: responseForRisk.contingencyPlan
            ? {
                description: responseForRisk.contingencyPlan.description,
                triggerConditions:
                  responseForRisk.contingencyPlan.triggerConditions,
                activationCriteria: [],
                actions: responseForRisk.contingencyPlan.actions,
                requiredResources:
                  responseForRisk.contingencyPlan.requiredResources.map(
                    (resource) => ({
                      type: 'other' as const,
                      description: resource,
                      quantity: 1,
                      cost: 0,
                    }),
                  ),
                estimatedCost: responseForRisk.contingencyPlan.estimatedCost,
                timeline: 'TBD',
                decisionAuthority: 'Project Manager',
              }
            : undefined,
          transferDetails: responseForRisk.transferDetails,
          monitoring: responseForRisk.monitoring,
          effectiveness: responseForRisk.effectiveness,
          status: 'draft',
          responseData: {
            originalPlan: responseForRisk,
            modifications: [],
            performanceHistory: [],
            stakeholderFeedback: [],
          },
          createdBy: userId,
        });

        await this.riskResponseRepository.save(riskResponse);
      }
    }
  }

  async getRiskRegister(
    projectId: string,
    organizationId?: string,
  ): Promise<any> {
    // Add organization filtering for tenant isolation
    const queryBuilder = this.riskRepository
      .createQueryBuilder('risk')
      .leftJoinAndSelect('risk.responses', 'responses')
      .leftJoinAndSelect('risk.monitoring', 'monitoring')
      .where('risk.projectId = :projectId', { projectId });

    // If organization ID is provided, filter by it for tenant isolation
    if (organizationId) {
      queryBuilder.andWhere('risk.organizationId = :organizationId', {
        organizationId,
      });
    }

    const risks = await queryBuilder
      .orderBy('risk.riskScore', 'DESC')
      .getMany();

    return {
      risks,
      summary: {
        total: risks.length,
        highPriority: risks.filter(
          (r) => r.riskLevel === 'high' || r.riskLevel === 'very-high',
        ).length,
        active: risks.filter((r) => r.status === 'active').length,
      },
    };
  }

  async updateRiskStatus(
    riskId: string,
    status: string,
    notes: string,
    userId: string,
  ): Promise<Risk> {
    const risk = await this.riskRepository.findOne({ where: { id: riskId } });
    if (!risk) {
      throw new Error('Risk not found');
    }

    risk.status = status;
    risk.statusNotes = notes;
    risk.lastUpdatedBy = userId;
    risk.updatedAt = new Date();

    return await this.riskRepository.save(risk);
  }

  async createRiskMonitoring(
    riskId: string,
    monitoringPlan: any,
    userId: string,
  ): Promise<RiskMonitoring> {
    const monitoring = this.riskMonitoringRepository.create({
      riskId,
      monitoringDate: new Date(),
      monitoringFrequency: monitoringPlan.frequency || 'weekly',
      kpis: monitoringPlan.kpis || [],
      monitoringData: {
        warningSignalsDetected: [],
        leadIndicatorsStatus: [],
        thresholdBreaches: [],
        observations: [],
        dataQuality: 'medium',
      },
      alertLevel: 'none',
      assignedTo: monitoringPlan.assignedTo,
      nextMonitoringDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      escalationRequired: false,
      createdBy: userId,
    });

    return await this.riskMonitoringRepository.save(monitoring);
  }
}
