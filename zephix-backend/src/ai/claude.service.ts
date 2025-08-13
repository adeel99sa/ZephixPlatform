import { Injectable, Logger } from '@nestjs/common';
import { LLMProviderService, LLMRequest } from './llm-provider.service';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private llmProvider: LLMProviderService) {}

  async analyzeRiskData(data: any): Promise<any> {
    if (!this.llmProvider.isConfigured()) {
      this.logger.warn('LLM provider not configured, returning fallback');
      return {
        analysis: 'AI analysis unavailable - provider not configured',
        confidence: 0.0,
        recommendations: [],
      };
    }

    const request: LLMRequest = {
      prompt: `Analyze the following risk data and provide insights:
      
${JSON.stringify(data, null, 2)}

Please provide:
1. Risk analysis summary
2. Confidence level (0-1)
3. Specific recommendations for risk mitigation

Return your response as valid JSON.`,
      systemPrompt:
        'You are a professional risk management expert. Analyze project risks and provide actionable insights based on industry best practices.',
      maxTokens: 2000,
    };

    try {
      const response = await this.llmProvider.sendRequest(request);
      return JSON.parse(response.content);
    } catch (error) {
      this.logger.error('Risk data analysis failed:', error);
      return {
        analysis: 'Analysis failed due to technical error',
        confidence: 0.0,
        recommendations: ['Review input data and try again'],
      };
    }
  }

  async generateRiskInsights(projectData: any): Promise<any> {
    if (!this.llmProvider.isConfigured()) {
      this.logger.warn('LLM provider not configured, returning fallback');
      return {
        insights: [],
        riskFactors: [],
        recommendations: [],
      };
    }

    const request: LLMRequest = {
      prompt: `Generate risk insights for the following project data:
      
${JSON.stringify(projectData, null, 2)}

Please provide:
1. Key insights about potential risks
2. Identified risk factors
3. Actionable recommendations

Return your response as valid JSON.`,
      systemPrompt:
        'You are a senior project manager with expertise in risk identification and assessment. Provide comprehensive risk insights.',
      maxTokens: 3000,
    };

    try {
      const response = await this.llmProvider.sendRequest(request);
      return JSON.parse(response.content);
    } catch (error) {
      this.logger.error('Risk insights generation failed:', error);
      return {
        insights: [],
        riskFactors: [],
        recommendations: ['Unable to generate insights due to technical error'],
      };
    }
  }

  async processRiskAssessment(assessmentData: any): Promise<any> {
    if (!this.llmProvider.isConfigured()) {
      this.logger.warn('LLM provider not configured, returning fallback');
      return {
        analysis: 'Risk assessment unavailable - provider not configured',
        findings: [],
        suggestions: [],
      };
    }

    const request: LLMRequest = {
      prompt: `Process the following risk assessment data:
      
${JSON.stringify(assessmentData, null, 2)}

Please provide:
1. Comprehensive analysis of the assessment
2. Key findings and observations
3. Specific suggestions for improvement

Return your response as valid JSON.`,
      systemPrompt:
        'You are a certified risk management professional. Analyze risk assessments and provide expert recommendations.',
      maxTokens: 2500,
    };

    try {
      const response = await this.llmProvider.sendRequest(request);
      return JSON.parse(response.content);
    } catch (error) {
      this.logger.error('Risk assessment processing failed:', error);
      return {
        analysis: 'Assessment processing failed due to technical error',
        findings: [],
        suggestions: ['Review assessment data and try again'],
      };
    }
  }

  async analyze(prompt: string): Promise<any> {
    if (!this.llmProvider.isConfigured()) {
      this.logger.warn('LLM provider not configured, returning fallback');
      return {
        analysis: 'AI analysis unavailable - provider not configured',
        confidence: 0.0,
        recommendations: [],
      };
    }

    const request: LLMRequest = {
      prompt: prompt,
      systemPrompt:
        'You are a professional project management expert. Provide thorough analysis and actionable recommendations.',
      maxTokens: 3000,
    };

    try {
      const response = await this.llmProvider.sendRequest(request);
      return {
        analysis: response.content,
        confidence: 0.8,
        recommendations: [],
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error('General analysis failed:', error);
      return {
        analysis: 'Analysis failed due to technical error',
        confidence: 0.0,
        recommendations: ['Please try again or contact support'],
      };
    }
  }

  async analyzeProjectData(data: any): Promise<any> {
    if (!this.llmProvider.isConfigured()) {
      this.logger.warn('LLM provider not configured, returning fallback');
      return {
        analysis: 'Project analysis unavailable - provider not configured',
        insights: [],
        recommendations: [],
      };
    }

    const request: LLMRequest = {
      prompt: `Analyze the following project data and provide insights:
      
${JSON.stringify(data, null, 2)}

Please provide:
1. Comprehensive project analysis
2. Key insights and observations
3. Specific recommendations for improvement

Return your response as valid JSON.`,
      systemPrompt:
        'You are an experienced project manager. Analyze project data and provide strategic insights and recommendations.',
      maxTokens: 3000,
    };

    try {
      const response = await this.llmProvider.sendRequest(request);
      return JSON.parse(response.content);
    } catch (error) {
      this.logger.error('Project data analysis failed:', error);
      return {
        analysis: 'Project analysis failed due to technical error',
        insights: [],
        recommendations: ['Review project data and try again'],
      };
    }
  }
}
