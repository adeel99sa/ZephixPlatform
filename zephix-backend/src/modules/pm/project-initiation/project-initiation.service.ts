import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaudeService } from '../../ai-assistant/claude.service';
import { UserProject } from '../entities/user-project.entity';
import { ProjectStakeholder } from '../entities/project-stakeholder.entity';
import { ProjectRisk } from '../entities/project-risk.entity';
import { DocumentAnalysisDto } from './dto/document-analysis.dto';
import { ProjectCharterDto } from './dto/project-charter.dto';
import { StakeholderAnalysisDto } from './dto/stakeholder-analysis.dto';
import type { Express } from 'express';

@Injectable()
export class ProjectInitiationService {
  private readonly logger = new Logger(ProjectInitiationService.name);

  constructor(
    @InjectRepository(UserProject)
    private readonly projectRepository: Repository<UserProject>,
    @InjectRepository(ProjectStakeholder)
    private readonly stakeholderRepository: Repository<ProjectStakeholder>,
    @InjectRepository(ProjectRisk)
    private readonly riskRepository: Repository<ProjectRisk>,
    private readonly claudeService: ClaudeService,
  ) {}

  async analyzeDocument(
    file: any,
    type: string,
    organizationContext: any,
    userId: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Starting document analysis for user: ${userId}, type: ${type}`,
      );

      // Extract text from document
      const documentText = await this.extractTextFromDocument(file);

      // Analyze document with Claude
      const analysisPrompt = this.buildAnalysisPrompt(
        type,
        documentText,
        organizationContext,
      );
      const analysis = await this.claudeService.analyze(analysisPrompt);

      // Create project from analysis
      const project = await this.createProjectFromAnalysis(
        analysis,
        userId,
        type,
      );

      // Generate project charter
      const charter = await this.generateProjectCharter(analysis, project.id);

      // Generate stakeholder analysis
      const stakeholders = await this.generateStakeholderAnalysis(
        analysis,
        project.id,
      );

      // Generate risk assessment
      const risks = await this.generateRiskAssessment(analysis, project.id);

      // Generate WBS structure
      const wbsStructure = await this.generateWBSStructure(
        analysis,
        project.id,
      );

      // Update project with all generated data
      await this.updateProjectWithInitiationData(project.id, {
        charter,
        stakeholders,
        risks,
        wbsStructure,
        analysis,
      });

      return {
        projectId: project.id,
        charter,
        stakeholders,
        risks,
        wbsStructure,
        analysis,
        recommendations: analysis.recommendations,
      };
    } catch (error) {
      this.logger.error(
        `Document analysis failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Document analysis failed: ${error.message}`,
      );
    }
  }

  private async extractTextFromDocument(file: any): Promise<string> {
    // For now, we'll assume the file contains text
    // In production, you'd use libraries like pdf-parse, mammoth, etc.
    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }

    // For other file types, you'd implement specific extractors
    throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
  }

  private buildAnalysisPrompt(
    type: string,
    documentText: string,
    orgContext: any,
  ): string {
    return `
You are an expert Project Management Professional (PMP) with 20+ years of experience in enterprise project management. 
Analyze the following ${type} document and extract key project information to create a comprehensive project initiation package.

Document Type: ${type}
Organization Context: ${JSON.stringify(orgContext, null, 2)}

Document Content:
${documentText}

Please provide a comprehensive analysis in the following JSON format:

{
  "projectTitle": "Clear, concise project title",
  "businessCase": "Detailed business justification and value proposition",
  "projectObjectives": ["Specific, measurable objective 1", "Specific, measurable objective 2"],
  "successCriteria": ["Measurable success criterion 1", "Measurable success criterion 2"],
  "scope": {
    "included": ["Scope item 1", "Scope item 2"],
    "excluded": ["Out of scope item 1", "Out of scope item 2"]
  },
  "assumptions": ["Key assumption 1", "Key assumption 2"],
  "constraints": ["Key constraint 1", "Key constraint 2"],
  "highLevelTimeline": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "majorMilestones": [
      {
        "name": "Milestone name",
        "date": "YYYY-MM-DD",
        "deliverables": ["Deliverable 1", "Deliverable 2"]
      }
    ]
  },
  "budgetEstimate": {
    "range": "Budget range (e.g., $500K - $750K)",
    "confidence": "low|medium|high",
    "breakdown": [
      {"category": "Category name", "percentage": 25}
    ]
  },
  "stakeholders": [
    {
      "name": "Stakeholder name",
      "role": "Role in project",
      "organization": "Organization",
      "influence": "low|medium|high",
      "interest": "low|medium|high",
      "category": "champion|supporter|neutral|critic|blocker",
      "communicationNeeds": ["Communication need 1", "Communication need 2"],
      "engagementStrategy": "Strategy description"
    }
  ],
  "risks": [
    {
      "category": "Risk category",
      "description": "Risk description",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "riskLevel": "low|medium|high",
      "responseStrategy": "avoid|transfer|mitigate|accept",
      "responseActions": ["Action 1", "Action 2"],
      "owner": "Risk owner name",
      "triggerConditions": ["Trigger 1", "Trigger 2"]
    }
  ],
  "wbsStructure": {
    "level1": [
      {
        "name": "Level 1 item name",
        "description": "Description",
        "level2": [
          {
            "name": "Level 2 item name",
            "description": "Description",
            "deliverables": ["Deliverable 1", "Deliverable 2"],
            "dependencies": ["Dependency 1", "Dependency 2"]
          }
        ]
      }
    ]
  },
  "recommendations": {
    "methodology": "waterfall|agile|hybrid",
    "teamSize": "Recommended team size",
    "criticalSuccessFactors": ["Factor 1", "Factor 2"],
    "governanceStructure": "Recommended governance approach",
    "communicationPlan": "Communication strategy recommendations"
  }
}

Ensure all responses are professional, enterprise-grade, and follow PMI standards.
`;
  }

  private async createProjectFromAnalysis(
    analysis: any,
    userId: string,
    type: string,
  ): Promise<UserProject> {
    const project = this.projectRepository.create({
      userId,
      name: analysis.projectTitle,
      description: analysis.businessCase,
      methodology: analysis.recommendations?.methodology || 'hybrid',
      status: 'initiating',
      startDate: new Date(analysis.highLevelTimeline?.startDate),
      targetEndDate: new Date(analysis.highLevelTimeline?.endDate),
      budget: this.parseBudget(analysis.budgetEstimate?.range),
      metadata: {
        documentType: type,
        analysis: analysis,
        createdAt: new Date(),
      },
    });

    return await this.projectRepository.save(project);
  }

  private parseBudget(budgetRange: string): number | undefined {
    if (!budgetRange) return undefined;

    // Extract the average from a range like "$500K - $750K"
    const match = budgetRange.match(/\$?(\d+(?:\.\d+)?)([KMB])?/g);
    if (match && match.length >= 2) {
      const values = match.map((val) => {
        const num = parseFloat(val.replace(/[^0-9.]/g, ''));
        const multiplier = val.includes('K')
          ? 1000
          : val.includes('M')
            ? 1000000
            : val.includes('B')
              ? 1000000000
              : 1;
        return num * multiplier;
      });
      return (values[0] + values[1]) / 2;
    }

    return undefined;
  }

  private async generateProjectCharter(
    analysis: any,
    projectId: string,
  ): Promise<any> {
    const charter = {
      projectTitle: analysis.projectTitle,
      businessCase: analysis.businessCase,
      projectObjectives: analysis.projectObjectives,
      successCriteria: analysis.successCriteria,
      scope: analysis.scope,
      assumptions: analysis.assumptions,
      constraints: analysis.constraints,
      highLevelTimeline: analysis.highLevelTimeline,
      budgetEstimate: analysis.budgetEstimate,
      projectManager: 'To be assigned',
      sponsor: 'To be assigned',
      approvalCriteria: analysis.successCriteria,
    };

    return charter;
  }

  private async generateStakeholderAnalysis(
    analysis: any,
    projectId: string,
  ): Promise<any> {
    const stakeholders = analysis.stakeholders || [];

    // Save stakeholders to database
    const stakeholderEntities = stakeholders.map((stakeholder) =>
      this.stakeholderRepository.create({
        projectId,
        name: stakeholder.name,
        role: stakeholder.role,
        organization: stakeholder.organization,
        influence: stakeholder.influence,
        interest: stakeholder.interest,
        category: stakeholder.category,
        engagementStrategy: stakeholder.engagementStrategy,
        metadata: {
          communicationNeeds: stakeholder.communicationNeeds,
        },
      }),
    );

    await this.stakeholderRepository.save(stakeholderEntities);

    // Generate RACI matrix
    const raciMatrix = this.generateRACIMatrix(stakeholders);

    // Generate influence-interest grid
    const influenceInterestGrid =
      this.generateInfluenceInterestGrid(stakeholders);

    return {
      stakeholders,
      raciMatrix,
      influenceInterestGrid,
    };
  }

  private generateRACIMatrix(stakeholders: any[]): any[] {
    // This would be generated based on project activities and stakeholders
    // For now, return a template structure
    return [
      {
        activity: 'Project Planning',
        responsible: stakeholders
          .filter((s) => s.category === 'champion')
          .map((s) => s.name),
        accountable:
          stakeholders.find((s) => s.role.includes('Manager'))?.name ||
          'Project Manager',
        consulted: stakeholders
          .filter((s) => s.category === 'supporter')
          .map((s) => s.name),
        informed: stakeholders
          .filter((s) => s.category === 'neutral')
          .map((s) => s.name),
      },
    ];
  }

  private generateInfluenceInterestGrid(stakeholders: any[]): any {
    return {
      manageClosely: stakeholders
        .filter((s) => s.influence === 'high' && s.interest === 'high')
        .map((s) => s.name),
      keepSatisfied: stakeholders
        .filter((s) => s.influence === 'high' && s.interest === 'low')
        .map((s) => s.name),
      keepInformed: stakeholders
        .filter((s) => s.influence === 'low' && s.interest === 'high')
        .map((s) => s.name),
      monitor: stakeholders
        .filter((s) => s.influence === 'low' && s.interest === 'low')
        .map((s) => s.name),
    };
  }

  private async generateRiskAssessment(
    analysis: any,
    projectId: string,
  ): Promise<any> {
    const risks = analysis.risks || [];

    // Save risks to database
    const riskEntities = risks.map((risk) =>
      this.riskRepository.create({
        projectId,
        category: risk.category,
        riskDescription: risk.description,
        probability: risk.probability,
        impact: risk.impact,
        riskScore: risk.riskScore,
        mitigationStrategy: risk.responseStrategy,
        owner: risk.owner,
        metadata: {
          responseActions: risk.responseActions,
          triggerConditions: risk.triggerConditions,
        },
      }),
    );

    await this.riskRepository.save(riskEntities);

    return {
      risks,
      riskSummary: {
        totalRisks: risks.length,
        highRisks: risks.filter((r) => r.riskLevel === 'high').length,
        mediumRisks: risks.filter((r) => r.riskLevel === 'medium').length,
        lowRisks: risks.filter((r) => r.riskLevel === 'low').length,
      },
    };
  }

  private async generateWBSStructure(
    analysis: any,
    projectId: string,
  ): Promise<any> {
    return (
      analysis.wbsStructure || {
        level1: [
          {
            name: 'Project Initiation',
            description: 'Project setup and charter development',
            level2: [
              {
                name: 'Stakeholder Analysis',
                description: 'Identify and analyze project stakeholders',
                deliverables: ['Stakeholder register', 'RACI matrix'],
                dependencies: [],
              },
            ],
          },
        ],
      }
    );
  }

  private async updateProjectWithInitiationData(
    projectId: string,
    data: any,
  ): Promise<void> {
    await this.projectRepository.update(projectId, {
      metadata: {
        ...data,
        initiationCompleted: true,
        initiationDate: new Date(),
      },
    });
  }

  async getProject(projectId: string): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['stakeholders', 'risks'],
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    return project;
  }

  async updateCharter(projectId: string, updates: any): Promise<any> {
    const project = await this.getProject(projectId);

    const updatedMetadata = {
      ...project.metadata,
      charter: {
        ...project.metadata?.charter,
        ...updates,
      },
    };

    await this.projectRepository.update(projectId, {
      metadata: updatedMetadata,
    });

    return updatedMetadata.charter;
  }

  async exportProject(projectId: string, format: string): Promise<any> {
    const project = await this.getProject(projectId);

    // This would integrate with a document generation service
    // For now, return the project data in the requested format
    return {
      project,
      format,
      exportUrl: `/api/pm/project-initiation/${projectId}/export/${format}`,
    };
  }
}
