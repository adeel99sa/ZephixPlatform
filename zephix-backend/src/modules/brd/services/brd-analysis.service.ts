import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LLMProviderService } from '../../ai-assistant/llm-provider.service';
import { BRD_ANALYSIS_PROMPTS } from '../../ai-assistant/prompts/brd-analysis.prompts';
import { BRDAnalysis } from '../entities/brd-analysis.entity';
import {
  GeneratedProjectPlan,
  ProjectMethodology,
} from '../entities/generated-project-plan.entity';
import { BRD } from '../entities/brd.entity';

export interface ExtractedElements {
  objectives: string[];
  scope: {
    inclusions: string[];
    exclusions: string[];
    assumptions: string[];
  };
  deliverables: Array<{
    name: string;
    description: string;
    acceptanceCriteria: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  stakeholders: Array<{
    name: string;
    role: string;
    responsibilities: string[];
    influence: 'high' | 'medium' | 'low';
  }>;
  constraints: {
    timeline: string;
    budget: string;
    resources: string[];
    technology: string[];
    regulatory: string[];
  };
  risks: Array<{
    risk: string;
    impact: 'high' | 'medium' | 'low';
    probability: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  successCriteria: Array<{
    criteria: string;
    metric: string;
    target: string;
  }>;
}

export interface BRDAnalysisResult {
  id: string;
  extractedElements: ExtractedElements;
  analysisMetadata: {
    confidence: number;
    processingTime: number;
    documentQuality: 'high' | 'medium' | 'low';
    missingElements: string[];
    suggestions: string[];
  };
}

@Injectable()
export class BRDAnalysisService {
  private readonly logger = new Logger(BRDAnalysisService.name);

  constructor(
    @InjectRepository(BRDAnalysis)
    private brdAnalysisRepository: Repository<BRDAnalysis>,
    @InjectRepository(GeneratedProjectPlan)
    private generatedProjectPlanRepository: Repository<GeneratedProjectPlan>,
    @InjectRepository(BRD)
    private brdRepository: Repository<BRD>,
    private llmProvider: LLMProviderService,
  ) {}

  async analyzeBRD(
    brdId: string,
    organizationId: string,
    analyzedBy: string,
  ): Promise<BRDAnalysisResult> {
    this.logger.log(
      `Starting BRD analysis for BRD ${brdId} in organization ${organizationId}`,
    );

    const brd = await this.brdRepository.findOne({
      where: { id: brdId, organizationId },
    });

    if (!brd) {
      throw new NotFoundException(
        `BRD with ID ${brdId} not found in organization ${organizationId}`,
      );
    }

    const startTime = Date.now();

    try {
      const extractedElements = await this.extractKeyElements(brd.payload);
      const analysisMetadata = await this.analyzeDocumentQuality(
        extractedElements,
        brd.payload,
      );

      const analysis = this.brdAnalysisRepository.create({
        brdId,
        organizationId,
        extractedElements,
        analysisMetadata,
        analyzedBy,
      });

      const savedAnalysis = await this.brdAnalysisRepository.save(analysis);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `BRD analysis completed in ${processingTime}ms with confidence ${analysisMetadata.confidence}`,
      );

      return {
        id: savedAnalysis.id,
        extractedElements,
        analysisMetadata,
      };
    } catch (error) {
      this.logger.error(`BRD analysis failed for BRD ${brdId}:`, error);
      throw new BadRequestException(`Failed to analyze BRD: ${error.message}`);
    }
  }

  async generateProjectPlan(
    analysisResult: BRDAnalysisResult,
    methodology: ProjectMethodology,
    organizationId: string,
    generatedBy: string,
  ): Promise<GeneratedProjectPlan> {
    this.logger.log(
      `Generating ${methodology} project plan for analysis ${analysisResult.id}`,
    );

    try {
      let planStructure: any;

      // Try AI-generated plan first, fallback to template-based generation
      try {
        planStructure = await this.generateAIPoweredPlan(
          analysisResult.extractedElements,
          methodology,
        );
      } catch (aiError) {
        this.logger.warn(
          'AI plan generation failed, falling back to template-based generation:',
          aiError,
        );

        switch (methodology) {
          case ProjectMethodology.WATERFALL:
            planStructure = this.generateWaterfallPlan(
              analysisResult.extractedElements,
            );
            break;
          case ProjectMethodology.AGILE:
            planStructure = this.generateAgilePlan(
              analysisResult.extractedElements,
            );
            break;
          case ProjectMethodology.HYBRID:
            planStructure = this.generateHybridPlan(
              analysisResult.extractedElements,
            );
            break;
          default:
            throw new BadRequestException(
              `Unsupported methodology: ${methodology}`,
            );
        }
      }

      const resourcePlan = this.generateResourcePlan(
        analysisResult.extractedElements,
        methodology,
      );
      const riskRegister = this.generateRiskRegister(
        analysisResult.extractedElements,
      );

      const generationMetadata = {
        confidence: analysisResult.analysisMetadata.confidence,
        methodology,
        alternativesConsidered: this.getAlternativeMethodologies(methodology),
        assumptions: analysisResult.extractedElements.scope.assumptions,
        recommendations: this.generateRecommendations(
          methodology,
          analysisResult.extractedElements,
        ),
      };

      const projectPlan = this.generatedProjectPlanRepository.create({
        brdAnalysisId: analysisResult.id,
        organizationId,
        methodology,
        planStructure,
        resourcePlan,
        riskRegister,
        generationMetadata,
        generatedBy,
      });

      const savedPlan =
        await this.generatedProjectPlanRepository.save(projectPlan);
      this.logger.log(
        `Project plan generated successfully with ID ${savedPlan.id}`,
      );
      return savedPlan;
    } catch (error) {
      this.logger.error(`Project plan generation failed:`, error);
      throw new BadRequestException(
        `Failed to generate project plan: ${error.message}`,
      );
    }
  }

  async refinePlan(
    planId: string,
    refinementRequest: string,
  ): Promise<GeneratedProjectPlan> {
    const plan = await this.generatedProjectPlanRepository.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Generated plan not found');
    }

    // Use structured prompt for plan refinement
    const refinementPrompt = `
      You are an expert project manager. Refine this project plan based on the requested changes.
      
      Current project plan: ${JSON.stringify(plan.planStructure)}
      Refinement request: ${refinementRequest}
      
      Apply the requested changes and return JSON with:
      1. updatedPlanStructure: The modified plan structure
      2. changesSummary: Array of specific changes made
      3. impactAssessment: How the changes affect timeline, resources, and risks
      4. recommendations: Additional suggestions for improvement
      
      Ensure the refined plan maintains consistency and feasibility.
    `;

    try {
      const response = await this.llmProvider.sendRequest({
        prompt: refinementPrompt,
        temperature: 0.3,
        maxTokens: 4000,
      });
      const refinementResult = JSON.parse(response.content);

      plan.planStructure = refinementResult.updatedPlanStructure;

      if (!plan.changesMade) {
        plan.changesMade = [];
      }

      plan.changesMade.push({
        refinementRequest,
        changes: refinementResult.changesSummary || [
          'Plan updated based on request',
        ],
        timestamp: new Date(),
        confidence: 0.85,
      });

      return await this.generatedProjectPlanRepository.save(plan);
    } catch (error) {
      this.logger.error('Plan refinement failed:', error);
      throw new Error('Failed to refine plan');
    }
  }

  async getAnalysisById(
    id: string,
    organizationId: string,
  ): Promise<BRDAnalysis> {
    const analysis = await this.brdAnalysisRepository.findOne({
      where: { id, organizationId },
      relations: ['brd'],
    });

    if (!analysis) {
      throw new NotFoundException(`BRD Analysis with ID ${id} not found`);
    }

    return analysis;
  }

  async getGeneratedPlanById(
    id: string,
    organizationId: string,
  ): Promise<GeneratedProjectPlan> {
    const plan = await this.generatedProjectPlanRepository.findOne({
      where: { id, organizationId },
      relations: ['brdAnalysis'],
    });

    if (!plan) {
      throw new NotFoundException(
        `Generated Project Plan with ID ${id} not found`,
      );
    }

    return plan;
  }

  async getLatestAnalysis(brdId: string): Promise<BRDAnalysisResult> {
    const analysis = await this.brdAnalysisRepository.findOne({
      where: { brdId },
      order: { createdAt: 'DESC' },
    });

    if (!analysis) {
      throw new NotFoundException(`No analysis found for BRD ${brdId}`);
    }

    return {
      id: analysis.id,
      extractedElements: analysis.extractedElements,
      analysisMetadata: analysis.analysisMetadata,
    };
  }

  async getAnalysisByBRD(
    brdId: string,
    organizationId: string,
  ): Promise<BRDAnalysis[]> {
    return this.brdAnalysisRepository.find({
      where: { brdId, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async listAnalysesByBRD(
    brdId: string,
    organizationId: string,
  ): Promise<BRDAnalysis[]> {
    return this.brdAnalysisRepository.find({
      where: { brdId, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async listGeneratedPlansByAnalysis(
    analysisId: string,
    organizationId: string,
  ): Promise<GeneratedProjectPlan[]> {
    return this.generatedProjectPlanRepository.find({
      where: { brdAnalysisId: analysisId, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getGeneratedPlans(
    brdId: string,
    organizationId: string,
  ): Promise<GeneratedProjectPlan[]> {
    const analyses = await this.getAnalysisByBRD(brdId, organizationId);
    const allPlans: GeneratedProjectPlan[] = [];

    for (const analysis of analyses) {
      const plans = await this.generatedProjectPlanRepository.find({
        where: { brdAnalysisId: analysis.id, organizationId },
        order: { createdAt: 'DESC' },
      });
      allPlans.push(...plans);
    }

    return allPlans;
  }

  async createProjectFromPlan(
    planId: string,
    projectData: any,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const plan = await this.getGeneratedPlanById(planId, organizationId);

    if (!plan) {
      throw new NotFoundException(`Project plan ${planId} not found`);
    }

    const project = {
      projectId: `proj-${Date.now()}`,
      projectName: projectData.projectName,
      status: 'created',
      message: 'Project successfully created from plan',
      createdAt: new Date(),
      planId: planId,
      organizationId: organizationId,
      createdBy: userId,
      projectData: projectData,
      planData: plan,
    };

    this.logger.log(
      `Project created from plan ${planId}: ${project.projectId}`,
    );
    return project;
  }

  private async extractKeyElements(
    brdContent: Record<string, any>,
  ): Promise<ExtractedElements> {
    const prompt = BRD_ANALYSIS_PROMPTS.analyzeBRD.replace(
      '{brdContent}',
      JSON.stringify(brdContent),
    );

    try {
      const response = await this.llmProvider.sendRequest({
        prompt,
        temperature: 0.3,
        maxTokens: 4000,
      });
      const extracted = JSON.parse(response.content);
      return this.validateAndNormalizeExtractedElements(extracted);
    } catch (error) {
      this.logger.error('Failed to parse AI extraction response:', error);
      return this.fallbackExtraction(brdContent);
    }
  }

  private async generateAIPoweredPlan(
    elements: ExtractedElements,
    methodology: ProjectMethodology,
  ): Promise<any> {
    const prompt = BRD_ANALYSIS_PROMPTS.generateProjectPlan
      .replace('{analysisData}', JSON.stringify(elements))
      .replace('{methodology}', methodology);

    try {
      const response = await this.llmProvider.sendRequest({
        prompt,
        temperature: 0.3,
        maxTokens: 6000,
      });

      const aiPlan = JSON.parse(response.content);

      // Validate and structure the AI response
      return {
        projectStructure:
          aiPlan.projectStructure ||
          this.generateFallbackStructure(methodology, elements),
        taskBreakdown: aiPlan.taskBreakdown || [],
        resourcePlanning: aiPlan.resourcePlanning || {},
        timeline: aiPlan.timeline || {},
        riskRegister: aiPlan.riskRegister || [],
        confidence: aiPlan.confidence || 0.8,
        alternativesConsidered: aiPlan.alternativesConsidered || [],
      };
    } catch (error) {
      this.logger.error('AI plan generation failed:', error);
      throw new Error('AI plan generation failed');
    }
  }

  private generateFallbackStructure(
    methodology: ProjectMethodology,
    elements: ExtractedElements,
  ): any {
    switch (methodology) {
      case ProjectMethodology.WATERFALL:
        return this.generateWaterfallPlan(elements);
      case ProjectMethodology.AGILE:
        return this.generateAgilePlan(elements);
      case ProjectMethodology.HYBRID:
        return this.generateHybridPlan(elements);
      default:
        return this.generateWaterfallPlan(elements);
    }
  }

  async validateBRDQuality(brdContent: Record<string, any>): Promise<{
    qualityScore: number;
    criticalGaps: string[];
    recommendations: string[];
    readinessAssessment: 'ready' | 'needs-work' | 'not-ready';
  }> {
    const prompt = BRD_ANALYSIS_PROMPTS.validateBRD.replace(
      '{brdContent}',
      JSON.stringify(brdContent),
    );

    try {
      const response = await this.llmProvider.sendRequest({
        prompt,
        temperature: 0.2,
        maxTokens: 3000,
      });

      const validationResult = JSON.parse(response.content);

      return {
        qualityScore: validationResult.overallQualityScore || 0,
        criticalGaps: validationResult.criticalGaps || [],
        recommendations: validationResult.recommendations || [],
        readinessAssessment:
          validationResult.readinessAssessment || 'needs-work',
      };
    } catch (error) {
      this.logger.error('BRD validation failed:', error);
      return {
        qualityScore: 0.5,
        criticalGaps: ['Unable to validate BRD due to processing error'],
        recommendations: [
          'Review BRD manually and ensure all required sections are complete',
        ],
        readinessAssessment: 'needs-work',
      };
    }
  }

  async extractDetailedRequirements(brdContent: Record<string, any>): Promise<{
    functionalRequirements: any[];
    nonFunctionalRequirements: any[];
    technicalRequirements: any[];
    businessRules: any[];
    interfaceRequirements: any[];
    priorityLevels: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
    dependencies: any[];
    acceptanceCriteria: Record<string, string[]>;
    confidence: number;
  }> {
    const prompt = BRD_ANALYSIS_PROMPTS.extractRequirements.replace(
      '{brdContent}',
      JSON.stringify(brdContent),
    );

    try {
      const response = await this.llmProvider.sendRequest({
        prompt,
        temperature: 0.3,
        maxTokens: 5000,
      });

      const requirementsResult = JSON.parse(response.content);

      return {
        functionalRequirements: requirementsResult.functionalRequirements || [],
        nonFunctionalRequirements:
          requirementsResult.nonFunctionalRequirements || [],
        technicalRequirements: requirementsResult.technicalRequirements || [],
        businessRules: requirementsResult.businessRules || [],
        interfaceRequirements: requirementsResult.interfaceRequirements || [],
        priorityLevels: requirementsResult.priorityLevels || [],
        dependencies: requirementsResult.dependencies || [],
        acceptanceCriteria: requirementsResult.acceptanceCriteria || {},
        confidence: requirementsResult.confidence || 0.7,
      };
    } catch (error) {
      this.logger.error('Requirements extraction failed:', error);
      return {
        functionalRequirements: [],
        nonFunctionalRequirements: [],
        technicalRequirements: [],
        businessRules: [],
        interfaceRequirements: [],
        priorityLevels: {},
        dependencies: [],
        acceptanceCriteria: {},
        confidence: 0.5,
      };
    }
  }

  async estimateProjectEffort(
    analysisData: any,
    requirementsData: any,
    teamSize: number,
    experienceLevel: 'junior' | 'mid' | 'senior',
  ): Promise<{
    developmentEffort: Record<string, number>;
    projectManagement: Record<string, number>;
    infrastructure: Record<string, number>;
    documentation: Record<string, number>;
    contingency: {
      bufferPercentage: number;
      riskMitigationHours: number;
      integrationComplexityFactor: number;
      learningCurveAdjustment: number;
    };
    totalProjectDuration: number;
    confidenceIntervals: Record<string, { min: number; max: number }>;
    riskFactors: string[];
    recommendations: string[];
  }> {
    const prompt = BRD_ANALYSIS_PROMPTS.estimateEffort
      .replace('{analysisData}', JSON.stringify(analysisData))
      .replace('{requirementsData}', JSON.stringify(requirementsData))
      .replace('{teamSize}', teamSize.toString())
      .replace('{experienceLevel}', experienceLevel);

    try {
      const response = await this.llmProvider.sendRequest({
        prompt,
        temperature: 0.2,
        maxTokens: 4000,
      });

      const effortResult = JSON.parse(response.content);

      return {
        developmentEffort: effortResult.developmentEffort || {},
        projectManagement: effortResult.projectManagement || {},
        infrastructure: effortResult.infrastructure || {},
        documentation: effortResult.documentation || {},
        contingency: effortResult.contingency || {
          bufferPercentage: 20,
          riskMitigationHours: 40,
          integrationComplexityFactor: 1.2,
          learningCurveAdjustment: 1.1,
        },
        totalProjectDuration: effortResult.totalProjectDuration || 0,
        confidenceIntervals: effortResult.confidenceIntervals || {},
        riskFactors: effortResult.riskFactors || [],
        recommendations: effortResult.recommendations || [],
      };
    } catch (error) {
      this.logger.error('Effort estimation failed:', error);
      return {
        developmentEffort: {},
        projectManagement: {},
        infrastructure: {},
        documentation: {},
        contingency: {
          bufferPercentage: 20,
          riskMitigationHours: 40,
          integrationComplexityFactor: 1.2,
          learningCurveAdjustment: 1.1,
        },
        totalProjectDuration: 0,
        confidenceIntervals: {},
        riskFactors: ['Unable to estimate effort due to processing error'],
        recommendations: [
          'Review requirements manually and estimate effort based on team experience',
        ],
      };
    }
  }

  private validateAndNormalizeExtractedElements(
    extracted: any,
  ): ExtractedElements {
    return {
      objectives: Array.isArray(extracted.objectives)
        ? extracted.objectives
        : [],
      scope: {
        inclusions: Array.isArray(extracted.scope?.inclusions)
          ? extracted.scope.inclusions
          : [],
        exclusions: Array.isArray(extracted.scope?.exclusions)
          ? extracted.scope.exclusions
          : [],
        assumptions: Array.isArray(extracted.scope?.assumptions)
          ? extracted.scope.assumptions
          : [],
      },
      deliverables: Array.isArray(extracted.deliverables)
        ? extracted.deliverables
        : [],
      stakeholders: Array.isArray(extracted.stakeholders)
        ? extracted.stakeholders
        : [],
      constraints: extracted.constraints || {
        timeline: '',
        budget: '',
        resources: [],
        technology: [],
        regulatory: [],
      },
      risks: Array.isArray(extracted.risks) ? extracted.risks : [],
      successCriteria: Array.isArray(extracted.successCriteria)
        ? extracted.successCriteria
        : [],
    };
  }

  private fallbackExtraction(
    brdContent: Record<string, any>,
  ): ExtractedElements {
    return {
      objectives: [
        brdContent.businessContext?.businessObjective ||
          'Business objective not specified',
      ],
      scope: {
        inclusions: [
          brdContent.businessContext?.problemStatement ||
            'Problem statement not specified',
        ],
        exclusions: [],
        assumptions: [],
      },
      deliverables: [],
      stakeholders: [],
      constraints: {
        timeline: '',
        budget: '',
        resources: [],
        technology: [],
        regulatory: [],
      },
      risks: [],
      successCriteria: [],
    };
  }

  private async analyzeDocumentQuality(
    extractedElements: ExtractedElements,
    brdContent: Record<string, any>,
  ): Promise<{
    confidence: number;
    processingTime: number;
    documentQuality: 'high' | 'medium' | 'low';
    missingElements: string[];
    suggestions: string[];
  }> {
    const missingElements: string[] = [];
    const suggestions: string[] = [];

    if (!extractedElements.objectives.length)
      missingElements.push('Project objectives');
    if (!extractedElements.scope.inclusions.length)
      missingElements.push('Scope definition');
    if (!extractedElements.deliverables.length)
      missingElements.push('Deliverables');

    const totalElements = 8;
    const presentElements = totalElements - missingElements.length;
    const confidence = Math.round((presentElements / totalElements) * 100);

    let documentQuality: 'high' | 'medium' | 'low';
    if (confidence >= 80) documentQuality = 'high';
    else if (confidence >= 60) documentQuality = 'medium';
    else documentQuality = 'low';

    if (missingElements.length > 0) {
      suggestions.push(`Add missing elements: ${missingElements.join(', ')}`);
    }

    return {
      confidence,
      processingTime: 0,
      documentQuality,
      missingElements,
      suggestions,
    };
  }

  private generateWaterfallPlan(elements: ExtractedElements): any {
    return {
      phases: [
        {
          id: 'phase-1',
          name: 'Project Initiation',
          description: 'Project setup and planning',
          duration: 2,
          dependencies: [],
          deliverables: ['Project Charter'],
          milestones: [
            {
              name: 'Project Approval',
              date: 'T+2 weeks',
              criteria: ['Approval received'],
            },
          ],
        },
      ],
      tasks: [
        {
          id: 'task-1',
          name: 'Create Project Charter',
          description: 'Develop project charter',
          estimatedHours: 16,
          dependencies: [],
          assignedRole: 'Project Manager',
          phase: 'phase-1',
        },
      ],
    };
  }

  private generateAgilePlan(elements: ExtractedElements): any {
    return {
      epics: [
        {
          id: 'epic-1',
          title: 'Core Functionality',
          description: 'Main project deliverables',
          priority: 1,
          storyPoints: 21,
          acceptanceCriteria: ['Meets requirements'],
          userStories: [],
        },
      ],
      tasks: [
        {
          id: 'task-1',
          name: 'Implement Core Features',
          description: 'Development of main features',
          estimatedHours: 80,
          dependencies: [],
          assignedRole: 'Developer',
          epic: 'epic-1',
        },
      ],
    };
  }

  private generateHybridPlan(elements: ExtractedElements): any {
    return {
      phases: [
        {
          id: 'phase-1',
          name: 'Planning Phase',
          description: 'Initial planning',
          duration: 3,
          dependencies: [],
          deliverables: ['Project Plan'],
          milestones: [
            {
              name: 'Planning Complete',
              date: 'T+3 weeks',
              criteria: ['Plan approved'],
            },
          ],
        },
      ],
      epics: [
        {
          id: 'epic-1',
          title: 'Development Epic',
          description: 'Main development work',
          priority: 1,
          storyPoints: 34,
          acceptanceCriteria: ['Quality standards met'],
          userStories: [],
        },
      ],
      tasks: [
        {
          id: 'task-1',
          name: 'Hybrid Planning Task',
          description: 'Combined planning and development',
          estimatedHours: 40,
          dependencies: [],
          assignedRole: 'Project Manager',
          phase: 'phase-1',
          epic: 'epic-1',
        },
      ],
    };
  }

  private generateResourcePlan(
    elements: ExtractedElements,
    methodology: ProjectMethodology,
  ): any {
    return {
      roles: [
        {
          role: 'Project Manager',
          skillsRequired: ['Project Management', 'Leadership'],
          timeCommitment: 'Full-time',
          duration: 'Project duration',
        },
      ],
      timeline: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        criticalPath: ['Planning', 'Development', 'Testing'],
        bufferTime: 2,
      },
      budget: {
        totalEstimate: 100000,
        breakdown: [
          {
            category: 'Personnel',
            amount: 70000,
            description: 'Team costs',
          },
        ],
      },
    };
  }

  private generateRiskRegister(elements: ExtractedElements): any[] {
    return [
      {
        id: 'risk-1',
        risk: 'Scope creep',
        category: 'Scope',
        impact: 'high',
        probability: 'medium',
        riskScore: 15,
        mitigation: 'Implement change control',
        contingency: 'Add buffer time',
        owner: 'Project Manager',
      },
    ];
  }

  private getAlternativeMethodologies(
    currentMethodology: ProjectMethodology,
  ): string[] {
    const alternatives = {
      [ProjectMethodology.WATERFALL]: ['Agile', 'Hybrid'],
      [ProjectMethodology.AGILE]: ['Waterfall', 'Hybrid'],
      [ProjectMethodology.HYBRID]: ['Waterfall', 'Agile'],
    };

    return alternatives[currentMethodology] || [];
  }

  private generateRecommendations(
    methodology: ProjectMethodology,
    elements: ExtractedElements,
  ): string[] {
    return [
      'Ensure regular stakeholder communication',
      'Implement proper change management',
      'Plan for adequate testing phases',
    ];
  }
}
