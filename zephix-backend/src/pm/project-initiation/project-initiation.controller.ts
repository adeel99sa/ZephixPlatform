import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ProjectInitiationService } from './project-initiation.service';
import { DocumentAnalysisDto } from './dto/document-analysis.dto';
import { ProjectCharterDto } from './dto/project-charter.dto';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@Controller('pm/project-initiation')
@UseGuards(JwtAuthGuard)
export class ProjectInitiationController {
  private readonly logger = new Logger(ProjectInitiationController.name);

  constructor(
    private readonly projectInitiationService: ProjectInitiationService,
  ) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('document'))
  async analyzeDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: DocumentAnalysisDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const { userId } = getAuthContext(req);
      this.logger.log(`Document analysis request from user: ${userId}`);

      if (!file) {
        throw new BadRequestException('Document file is required');
      }

      // Validate file type
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.mimetype}. Supported types: ${allowedTypes.join(', ')}`,
        );
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 10MB limit');
      }

      const result = await this.projectInitiationService.analyzeDocument(
        file,
        body.type,
        body.organizationContext,
        userId,
      );

      return {
        success: true,
        message: 'Document analysis completed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Document analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':projectId')
  async getProject(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    try {
      const { userId } = getAuthContext(req);
      this.logger.log(`Getting project: ${projectId} for user: ${userId}`);

      const project = await this.projectInitiationService.getProject(projectId);

      // Verify user has access to this project
      if (project.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      return {
        success: true,
        data: project,
      };
    } catch (error) {
      this.logger.error(`Failed to get project: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put(':projectId/charter')
  async updateCharter(
    @Param('projectId') projectId: string,
    @Body() updates: ProjectCharterDto,
    @Request() req: AuthRequest,
  ) {
    try {
      this.logger.log(`Updating charter for project: ${projectId}`);

      const charter = await this.projectInitiationService.updateCharter(
        projectId,
        updates,
      );

      return {
        success: true,
        message: 'Project charter updated successfully',
        data: charter,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update charter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':projectId/dashboard/metrics')
  async getDashboardMetrics(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    try {
      const { userId } = getAuthContext(req);
      this.logger.log(`Getting dashboard metrics for project: ${projectId}`);

      const project = await this.projectInitiationService.getProject(projectId);

      // Verify user has access to this project
      if (project.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      // Calculate readiness metrics
      const metrics = this.calculateReadinessMetrics(project);

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':projectId/export')
  async exportProject(
    @Param('projectId') projectId: string,
    @Body() exportOptions: { format: string; sections: string[] },
    @Request() req: AuthRequest,
  ) {
    try {
      this.logger.log(
        `Exporting project: ${projectId} in format: ${exportOptions.format}`,
      );

      const exportResult = await this.projectInitiationService.exportProject(
        projectId,
        exportOptions.format,
      );

      return {
        success: true,
        message: 'Project exported successfully',
        data: exportResult,
      };
    } catch (error) {
      this.logger.error(
        `Failed to export project: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':projectId/stakeholders')
  async getStakeholders(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    try {
      const { userId } = getAuthContext(req);
      this.logger.log(`Getting stakeholders for project: ${projectId}`);

      const project = await this.projectInitiationService.getProject(projectId);

      // Verify user has access to this project
      if (project.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      return {
        success: true,
        data: {
          stakeholders: project.stakeholders || [],
          raciMatrix: project.metadata?.stakeholders?.raciMatrix || [],
          influenceInterestGrid:
            project.metadata?.stakeholders?.influenceInterestGrid || {},
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stakeholders: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':projectId/risks')
  async getRisks(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    try {
      const { userId } = getAuthContext(req);
      this.logger.log(`Getting risks for project: ${projectId}`);

      const project = await this.projectInitiationService.getProject(projectId);

      // Verify user has access to this project
      if (project.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      return {
        success: true,
        data: {
          risks: project.risks || [],
          riskSummary: project.metadata?.risks?.riskSummary || {},
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get risks: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':projectId/wbs')
  async getWBS(
    @Param('projectId') projectId: string,
    @Request() req: AuthRequest,
  ) {
    try {
      const { userId } = getAuthContext(req);
      this.logger.log(`Getting WBS for project: ${projectId}`);

      const project = await this.projectInitiationService.getProject(projectId);

      // Verify user has access to this project
      if (project.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      return {
        success: true,
        data: {
          wbsStructure: project.metadata?.wbsStructure || {},
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get WBS: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculateReadinessMetrics(project: any): any {
    const metrics = {
      overallReadiness: 0,
      charterCompleteness: 0,
      stakeholderAnalysis: 0,
      riskAssessment: 0,
      wbsCompleteness: 0,
      recommendations: 0,
    };

    // Calculate charter completeness
    if (project.metadata?.charter) {
      const charter = project.metadata.charter;
      const charterFields = [
        'projectTitle',
        'businessCase',
        'projectObjectives',
        'successCriteria',
        'scope',
        'assumptions',
        'constraints',
        'highLevelTimeline',
        'budgetEstimate',
      ];
      const completedFields = charterFields.filter(
        (field) =>
          charter[field] &&
          (Array.isArray(charter[field]) ? charter[field].length > 0 : true),
      );
      metrics.charterCompleteness =
        (completedFields.length / charterFields.length) * 100;
    }

    // Calculate stakeholder analysis completeness
    if (project.stakeholders && project.stakeholders.length > 0) {
      metrics.stakeholderAnalysis = Math.min(
        100,
        project.stakeholders.length * 20,
      );
    }

    // Calculate risk assessment completeness
    if (project.risks && project.risks.length > 0) {
      metrics.riskAssessment = Math.min(100, project.risks.length * 25);
    }

    // Calculate WBS completeness
    if (project.metadata?.wbsStructure?.level1) {
      const wbsItems = project.metadata.wbsStructure.level1.length;
      metrics.wbsCompleteness = Math.min(100, wbsItems * 50);
    }

    // Calculate recommendations completeness
    if (project.metadata?.recommendations) {
      const recommendationFields = [
        'methodology',
        'teamSize',
        'criticalSuccessFactors',
      ];
      const completedFields = recommendationFields.filter(
        (field) => project.metadata.recommendations[field],
      );
      metrics.recommendations =
        (completedFields.length / recommendationFields.length) * 100;
    }

    // Calculate overall readiness
    const weights = {
      charterCompleteness: 0.3,
      stakeholderAnalysis: 0.2,
      riskAssessment: 0.2,
      wbsCompleteness: 0.2,
      recommendations: 0.1,
    };

    metrics.overallReadiness = Object.keys(weights).reduce((total, key) => {
      return total + metrics[key] * weights[key];
    }, 0);

    return metrics;
  }
}
