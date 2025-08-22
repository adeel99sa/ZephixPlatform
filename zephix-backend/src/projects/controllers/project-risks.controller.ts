import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Optional,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RiskManagementService } from '../../pm/risk-management/risk-management.service';
import { ProjectsService } from '../services/projects.service';



@Controller('api/projects/:projectId/risks')
@UseGuards(JwtAuthGuard)
export class ProjectRisksController {
  constructor(
    @Optional() private readonly riskManagementService: RiskManagementService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Post()
  async performRiskAnalysis(
    @Param('projectId') projectId: string,
    @Body() riskAnalysisDto: any,
    @Req() req: any,
  ) {
    // Verify project access first
    const project = await this.projectsService.findOne(projectId);
    if (!project || project.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    if (!this.riskManagementService) {
      throw new ServiceUnavailableException('Risk management not available');
    }

    // Use EXISTING risk management service methods
    const input = {
      projectId,
      riskSources: riskAnalysisDto.riskSources || {
        projectData: true,
        externalFactors: false,
        stakeholderFeedback: false,
        historicalData: false,
        industryTrends: false,
        marketConditions: false,
      },
      scanDepth: riskAnalysisDto.scanDepth || 'basic',
      focusAreas: riskAnalysisDto.focusAreas || [],
    };

    return await this.riskManagementService.performRiskAnalysis(input, req.user.id);
  }

  @Get()
  async getProjectRisks(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    // Verify project access first
    const project = await this.projectsService.findOne(projectId);
    if (!project || project.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    if (!this.riskManagementService) {
      throw new ServiceUnavailableException('Risk management not available');
    }

    // Use EXISTING risk management service methods
    return await this.riskManagementService.getRiskRegister(projectId);
  }
}
