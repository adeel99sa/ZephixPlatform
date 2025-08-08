import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RiskManagementService } from './risk-management.service';
import type { RiskIdentificationInput } from './risk-management.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('pm/risk-management')
@UseGuards(JwtAuthGuard)
export class RiskManagementController {
  constructor(private readonly riskManagementService: RiskManagementService) {}

  @Post('analyze')
  async performRiskAnalysis(
    @Body() input: RiskIdentificationInput,
    @Request() req,
  ) {
    return await this.riskManagementService.performRiskAnalysis(
      input,
      req.user.id,
    );
  }

  @Get('register/:projectId')
  async getRiskRegister(@Param('projectId') projectId: string) {
    return await this.riskManagementService.getRiskRegister(projectId);
  }

  @Put('risk/:riskId/status')
  async updateRiskStatus(
    @Param('riskId') riskId: string,
    @Body() body: { status: string; notes: string },
    @Request() req,
  ) {
    return await this.riskManagementService.updateRiskStatus(
      riskId,
      body.status,
      body.notes,
      req.user.id,
    );
  }

  @Post('risk/:riskId/monitoring')
  async createRiskMonitoring(
    @Param('riskId') riskId: string,
    @Body() monitoringPlan: any,
    @Request() req,
  ) {
    return await this.riskManagementService.createRiskMonitoring(
      riskId,
      monitoringPlan,
      req.user.id,
    );
  }
}
