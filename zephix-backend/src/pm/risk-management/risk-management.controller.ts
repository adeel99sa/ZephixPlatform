import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RiskManagementService } from './risk-management.service';
import type { RiskIdentificationInput } from './risk-management.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';

@ApiTags('Risk Management')
@ApiBearerAuth()
@Controller('pm/risk-management')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class RiskManagementController {
  constructor(private readonly riskManagementService: RiskManagementService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Perform risk analysis for a project' })
  @ApiResponse({ status: 200, description: 'Risk analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
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
  @ApiOperation({ summary: 'Get risk register for a specific project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Risk register retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getRiskRegister(@Param('projectId') projectId: string, @Request() req) {
    return await this.riskManagementService.getRiskRegister(
      projectId, 
      req.user.organizationId
    );
  }

  @Put('risk/:riskId/status')
  @ApiOperation({ summary: 'Update risk status' })
  @ApiParam({ name: 'riskId', description: 'Risk ID' })
  @ApiResponse({ status: 200, description: 'Risk status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Risk not found' })
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
  @ApiOperation({ summary: 'Create risk monitoring plan' })
  @ApiParam({ name: 'riskId', description: 'Risk ID' })
  @ApiResponse({ status: 201, description: 'Risk monitoring plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Risk not found' })
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
