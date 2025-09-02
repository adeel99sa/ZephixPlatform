import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { RiskDetectionService } from '../services/risk-detection.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';

@Controller({ path: 'risks', version: '1' })
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class RisksController {
  constructor(private readonly riskService: RiskDetectionService) {}

  @Post('scan/:projectId')
  scanProject(
    @Param('projectId') projectId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.riskService.scanProject(projectId, organizationId);
  }

  @Get('project/:projectId')
  getProjectRisks(
    @Param('projectId') projectId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.riskService.getRisksByProject(projectId, organizationId);
  }
}
