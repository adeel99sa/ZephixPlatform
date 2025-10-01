import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('project-metrics')
  async getProjectMetrics(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.analyticsService.getProjectMetrics(organizationId);
  }

  @Get('resource-metrics')
  async getResourceMetrics(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.analyticsService.getResourceMetrics(organizationId);
  }

  @Get('risk-metrics')
  async getRiskMetrics(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.analyticsService.getRiskMetrics(organizationId);
  }
}
