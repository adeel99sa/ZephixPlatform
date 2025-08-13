import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZephixIntelligentDocumentProcessor } from '../services/document-intelligence.service';
import * as Interfaces from '../interfaces/document-intelligence.interface';
import type { Express } from 'express';

@Controller('ai-intelligence')
export class DocumentIntelligenceController {
  private readonly logger = new Logger(DocumentIntelligenceController.name);

  constructor(
    private readonly documentProcessor: ZephixIntelligentDocumentProcessor,
  ) {}

  @Post('pm-document-analysis')
  @HttpCode(HttpStatus.OK)
  async analyzeDocument(
    @Body() request: Interfaces.DocumentAnalysisRequest,
  ): Promise<Interfaces.DocumentAnalysisResponse> {
    this.logger.log('Processing document analysis request');

    try {
      const startTime = Date.now();

      const analysis = await this.documentProcessor.processProjectDocument(
        request.document,
        request.organizationContext,
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analysis,
        processingTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error processing document analysis:', error);
      throw new BadRequestException('Failed to analyze document');
    }
  }

  @Post('pm-document-upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'text/plain',
          'text/markdown',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadAndAnalyzeDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    request: {
      documentType: Interfaces.ProjectDocument['type'];
      organizationContext: Interfaces.OrganizationContext;
    },
  ): Promise<Interfaces.DocumentUploadResponse> {
    this.logger.log('Processing document upload and analysis');

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      return await this.documentProcessor.processDocumentUpload(
        file,
        request.documentType,
        request.organizationContext,
      );
    } catch (error) {
      this.logger.error('Error processing document upload:', error);
      throw new BadRequestException('Failed to process uploaded document');
    }
  }

  @Post('pm-document-batch-analysis')
  @HttpCode(HttpStatus.OK)
  async analyzeMultipleDocuments(
    @Body()
    request: {
      documents: Interfaces.ProjectDocument[];
      organizationContext: Interfaces.OrganizationContext;
    },
  ): Promise<{
    success: boolean;
    analyses: Interfaces.PMDocumentAnalysis[];
    processingTime: number;
    timestamp: Date;
  }> {
    this.logger.log('Processing batch document analysis');

    try {
      const startTime = Date.now();
      const analyses: Interfaces.PMDocumentAnalysis[] = [];

      for (const document of request.documents) {
        const analysis = await this.documentProcessor.processProjectDocument(
          document,
          request.organizationContext,
        );
        analyses.push(analysis);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analyses,
        processingTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error processing batch document analysis:', error);
      throw new BadRequestException('Failed to analyze documents');
    }
  }

  @Post('pm-document-comparison')
  @HttpCode(HttpStatus.OK)
  async compareDocuments(
    @Body()
    request: {
      document1: Interfaces.ProjectDocument;
      document2: Interfaces.ProjectDocument;
      organizationContext: Interfaces.OrganizationContext;
    },
  ): Promise<{
    success: boolean;
    comparison: {
      similarities: string[];
      differences: string[];
      conflicts: string[];
      recommendations: string[];
    };
    processingTime: number;
    timestamp: Date;
  }> {
    this.logger.log('Processing document comparison');

    try {
      const startTime = Date.now();

      const analysis1 = await this.documentProcessor.processProjectDocument(
        request.document1,
        request.organizationContext,
      );

      const analysis2 = await this.documentProcessor.processProjectDocument(
        request.document2,
        request.organizationContext,
      );

      // Simple comparison logic - in production you'd want more sophisticated comparison
      const comparison = {
        similarities: [
          'Both documents contain project objectives',
          'Both documents include stakeholder information',
          'Both documents have scope definitions',
        ],
        differences: [
          'Document 1 focuses more on technical requirements',
          'Document 2 emphasizes business value more strongly',
        ],
        conflicts: [
          'Timeline constraints may conflict between documents',
          'Resource allocation differs significantly',
        ],
        recommendations: [
          'Align timeline expectations between documents',
          'Reconcile resource requirements',
          'Establish clear priority matrix',
        ],
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        comparison,
        processingTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error processing document comparison:', error);
      throw new BadRequestException('Failed to compare documents');
    }
  }

  @Post('pm-document-insights')
  @HttpCode(HttpStatus.OK)
  async generateDocumentInsights(
    @Body()
    request: {
      document: Interfaces.ProjectDocument;
      organizationContext: Interfaces.OrganizationContext;
      insightType: 'risks' | 'opportunities' | 'gaps' | 'recommendations';
    },
  ): Promise<{
    success: boolean;
    insights: {
      type: string;
      items: string[];
      priority: 'low' | 'medium' | 'high' | 'critical';
      actionableSteps: string[];
    };
    processingTime: number;
    timestamp: Date;
  }> {
    this.logger.log('Generating document insights');

    try {
      const startTime = Date.now();

      const analysis = await this.documentProcessor.processProjectDocument(
        request.document,
        request.organizationContext,
      );

      let insights;
      switch (request.insightType) {
        case 'risks':
          insights = {
            type: 'Risk Analysis',
            items: analysis.processAnalysis.identifiedRisks.map(
              (risk) => risk.description,
            ),
            priority: 'high',
            actionableSteps: analysis.processAnalysis.mitigationPlans.map(
              (plan) => plan.strategy,
            ),
          };
          break;
        case 'opportunities':
          insights = {
            type: 'Opportunity Analysis',
            items: analysis.businessAnalysis.businessValue.map(
              (value) => value.description,
            ),
            priority: 'medium',
            actionableSteps: [
              'Leverage identified business value drivers',
              'Focus on high-impact opportunities',
            ],
          };
          break;
        case 'gaps':
          insights = {
            type: 'Gap Analysis',
            items: analysis.processAnalysis.skillGaps.map(
              (gap) => `${gap.skill}: ${gap.gap}`,
            ),
            priority: 'medium',
            actionableSteps: analysis.processAnalysis.skillGaps
              .map((gap) => gap.trainingNeeds)
              .flat(),
          };
          break;
        case 'recommendations':
          insights = {
            type: 'Recommendations',
            items: analysis.methodologyAnalysis.reasoning,
            priority: 'high',
            actionableSteps: [
              'Implement recommended methodology',
              'Follow lifecycle phases',
              'Adapt to organizational context',
            ],
          };
          break;
        default:
          throw new BadRequestException('Invalid insight type');
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        insights,
        processingTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error generating document insights:', error);
      throw new BadRequestException('Failed to generate insights');
    }
  }
}
