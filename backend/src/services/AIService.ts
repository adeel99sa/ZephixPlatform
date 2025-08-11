import OpenAI from 'openai';
import { config } from '../config';
import {
  Template,
  BRDDocument,
  AIAnalysis,
  RiskAssessment,
  ResourcePrediction,
  TimelineOptimization,
  IntegrationComplexity,
  AISuggestion,
  Risk,
  Role,
  Milestone,
  SystemIntegration,
} from '../../shared/types';

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Field Suggestions
  async generateFieldSuggestion(
    fieldName: string,
    fieldType: string,
    projectContext: Record<string, any>,
    industry: string,
    customPrompt?: string
  ): Promise<AISuggestion> {
    const prompt = customPrompt || this.buildFieldSuggestionPrompt(
      fieldName,
      fieldType,
      projectContext,
      industry
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst helping to complete BRD fields with relevant, industry-specific content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const suggestion = response.choices[0]?.message?.content || '';
      
      return {
        fieldId: fieldName,
        suggestion,
        confidence: this.calculateConfidence(suggestion, fieldType),
        reasoning: 'Generated based on project context and industry best practices',
      };
    } catch (error) {
      console.error('Error generating field suggestion:', error);
      throw error;
    }
  }

  // Risk Assessment
  async performRiskAssessment(
    documentData: Record<string, any>,
    industry: string,
    customPrompt?: string
  ): Promise<RiskAssessment> {
    const prompt = customPrompt || this.buildRiskAssessmentPrompt(documentData, industry);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a risk assessment expert. Analyze the project and identify potential risks with mitigation strategies.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        overallRiskLevel: result.overallRiskLevel || 'medium',
        risks: this.parseRisks(result.risks || []),
        mitigationStrategies: result.mitigationStrategies || [],
      };
    } catch (error) {
      console.error('Error performing risk assessment:', error);
      throw error;
    }
  }

  // Resource Prediction
  async predictResources(
    documentData: Record<string, any>,
    industry: string
  ): Promise<ResourcePrediction> {
    const prompt = this.buildResourcePredictionPrompt(documentData, industry);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a project resource planning expert. Predict the required team size, roles, and budget for the project.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        estimatedTeamSize: result.estimatedTeamSize || 5,
        requiredRoles: this.parseRoles(result.requiredRoles || []),
        estimatedBudget: {
          min: result.budgetMin || 50000,
          max: result.budgetMax || 150000,
          currency: 'USD',
          confidence: result.confidence || 0.7,
        },
        recommendedSkills: result.recommendedSkills || [],
      };
    } catch (error) {
      console.error('Error predicting resources:', error);
      throw error;
    }
  }

  // Timeline Optimization
  async optimizeTimeline(
    documentData: Record<string, any>,
    constraints?: { startDate?: Date; deadline?: Date }
  ): Promise<TimelineOptimization> {
    const prompt = this.buildTimelineOptimizationPrompt(documentData, constraints);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a project management expert. Create an optimized timeline with milestones and critical path analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        estimatedDuration: result.estimatedDuration || 90,
        recommendedStartDate: new Date(result.recommendedStartDate || Date.now()),
        milestones: this.parseMilestones(result.milestones || []),
        criticalPath: result.criticalPath || [],
        bufferRecommendation: result.bufferRecommendation || 20,
      };
    } catch (error) {
      console.error('Error optimizing timeline:', error);
      throw error;
    }
  }

  // Integration Complexity Analysis
  async analyzeIntegrationComplexity(
    documentData: Record<string, any>,
    systems: string[]
  ): Promise<IntegrationComplexity> {
    const prompt = this.buildIntegrationAnalysisPrompt(documentData, systems);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a systems integration expert. Analyze the complexity of integrating the specified systems.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        score: result.score || 5,
        systems: this.parseSystemIntegrations(result.systems || []),
        recommendations: result.recommendations || [],
        estimatedEffort: result.estimatedEffort || 120,
      };
    } catch (error) {
      console.error('Error analyzing integration complexity:', error);
      throw error;
    }
  }

  // Comprehensive AI Analysis
  async performComprehensiveAnalysis(
    document: BRDDocument,
    template: Template
  ): Promise<AIAnalysis> {
    const aiSettings = template.aiSettings;
    const analysis: AIAnalysis = {
      generatedAt: new Date(),
    };

    if (aiSettings?.enableRiskAssessment) {
      analysis.riskAssessment = await this.performRiskAssessment(
        document.data,
        template.industry,
        aiSettings.customPrompts?.riskAssessment
      );
    }

    if (aiSettings?.enableResourcePrediction) {
      analysis.resourcePrediction = await this.predictResources(
        document.data,
        template.industry
      );
    }

    if (aiSettings?.enableTimelineOptimization) {
      analysis.timelineOptimization = await this.optimizeTimeline(document.data);
    }

    if (aiSettings?.enableIntegrationAnalysis) {
      const systems = this.extractSystemsFromDocument(document.data);
      if (systems.length > 0) {
        analysis.integrationComplexity = await this.analyzeIntegrationComplexity(
          document.data,
          systems
        );
      }
    }

    return analysis;
  }

  // Helper methods
  private buildFieldSuggestionPrompt(
    fieldName: string,
    fieldType: string,
    context: Record<string, any>,
    industry: string
  ): string {
    return `
      Generate a suggestion for the BRD field: "${fieldName}"
      Field Type: ${fieldType}
      Industry: ${industry}
      Project Context: ${JSON.stringify(context, null, 2)}
      
      Provide a relevant, professional suggestion that fits the industry context.
      The suggestion should be concise but comprehensive.
    `;
  }

  private buildRiskAssessmentPrompt(data: Record<string, any>, industry: string): string {
    return `
      Analyze the following project data and identify risks:
      Industry: ${industry}
      Project Data: ${JSON.stringify(data, null, 2)}
      
      Return a JSON object with:
      {
        "overallRiskLevel": "low|medium|high|critical",
        "risks": [
          {
            "category": "string",
            "description": "string",
            "probability": number (1-5),
            "impact": number (1-5),
            "mitigation": "string"
          }
        ],
        "mitigationStrategies": ["string"]
      }
    `;
  }

  private buildResourcePredictionPrompt(data: Record<string, any>, industry: string): string {
    return `
      Predict resource requirements for the following project:
      Industry: ${industry}
      Project Data: ${JSON.stringify(data, null, 2)}
      
      Return a JSON object with:
      {
        "estimatedTeamSize": number,
        "requiredRoles": [
          {
            "title": "string",
            "count": number,
            "skills": ["string"],
            "level": "junior|mid|senior|lead"
          }
        ],
        "budgetMin": number,
        "budgetMax": number,
        "confidence": number (0-1),
        "recommendedSkills": ["string"]
      }
    `;
  }

  private buildTimelineOptimizationPrompt(
    data: Record<string, any>,
    constraints?: { startDate?: Date; deadline?: Date }
  ): string {
    return `
      Create an optimized project timeline:
      Project Data: ${JSON.stringify(data, null, 2)}
      Constraints: ${JSON.stringify(constraints, null, 2)}
      
      Return a JSON object with:
      {
        "estimatedDuration": number (days),
        "recommendedStartDate": "ISO date string",
        "milestones": [
          {
            "name": "string",
            "duration": number (days),
            "dependencies": ["milestone names"],
            "deliverables": ["string"]
          }
        ],
        "criticalPath": ["milestone names"],
        "bufferRecommendation": number (percentage)
      }
    `;
  }

  private buildIntegrationAnalysisPrompt(data: Record<string, any>, systems: string[]): string {
    return `
      Analyze integration complexity for:
      Systems to integrate: ${systems.join(', ')}
      Project Data: ${JSON.stringify(data, null, 2)}
      
      Return a JSON object with:
      {
        "score": number (1-10),
        "systems": [
          {
            "name": "string",
            "type": "string",
            "complexity": "low|medium|high",
            "requirements": ["string"]
          }
        ],
        "recommendations": ["string"],
        "estimatedEffort": number (hours)
      }
    `;
  }

  private calculateConfidence(suggestion: string, fieldType: string): number {
    // Simple confidence calculation based on suggestion length and field type
    const baseConfidence = 0.7;
    const lengthBonus = Math.min(suggestion.length / 500, 0.2);
    const typeBonus = ['text', 'textarea', 'rich_text'].includes(fieldType) ? 0.1 : 0;
    
    return Math.min(baseConfidence + lengthBonus + typeBonus, 0.95);
  }

  private parseRisks(risks: any[]): Risk[] {
    return risks.map((risk, index) => ({
      id: `risk-${index}`,
      category: risk.category || 'General',
      description: risk.description || '',
      probability: risk.probability || 3,
      impact: risk.impact || 3,
      score: (risk.probability || 3) * (risk.impact || 3),
      mitigation: risk.mitigation,
    }));
  }

  private parseRoles(roles: any[]): Role[] {
    return roles.map(role => ({
      title: role.title || 'Team Member',
      count: role.count || 1,
      skills: role.skills || [],
      level: role.level || 'mid',
    }));
  }

  private parseMilestones(milestones: any[]): Milestone[] {
    return milestones.map((milestone, index) => ({
      id: `milestone-${index}`,
      name: milestone.name || `Milestone ${index + 1}`,
      duration: milestone.duration || 14,
      dependencies: milestone.dependencies || [],
      deliverables: milestone.deliverables || [],
    }));
  }

  private parseSystemIntegrations(systems: any[]): SystemIntegration[] {
    return systems.map(system => ({
      name: system.name || 'Unknown System',
      type: system.type || 'API',
      complexity: system.complexity || 'medium',
      requirements: system.requirements || [],
    }));
  }

  private extractSystemsFromDocument(data: Record<string, any>): string[] {
    // Extract system names from document data
    const systems: string[] = [];
    
    // Look for common fields that might contain system information
    const systemFields = ['systems', 'integrations', 'external_systems', 'third_party_services'];
    
    for (const field of systemFields) {
      if (data[field]) {
        if (Array.isArray(data[field])) {
          systems.push(...data[field]);
        } else if (typeof data[field] === 'string') {
          systems.push(...data[field].split(',').map(s => s.trim()));
        }
      }
    }
    
    return [...new Set(systems)]; // Remove duplicates
  }
}