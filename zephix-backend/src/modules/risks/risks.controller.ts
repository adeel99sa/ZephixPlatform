import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RisksService } from './risks.service';
import { CreateRiskDto, UpdateRiskDto, RiskResponseDto, RiskMatrixDto, RiskStatsDto } from './dto';
import { RiskType, RiskSeverity, RiskStatus } from './entities/risk.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';

@ApiTags('risks')
@Controller('risks')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
@ApiBearerAuth()
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new risk' })
  @ApiResponse({ status: 201, description: 'Risk created successfully', type: RiskResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRisk(
    @Body() createRiskDto: CreateRiskDto,
    @Request() req: any,
  ): Promise<RiskResponseDto> {
    console.log('🎯 RisksController.createRisk called with:', JSON.stringify(createRiskDto, null, 2));
    const organizationId = req.user.organizationId;
    const identifiedBy = req.user.sub;
    console.log('🎯 Organization ID:', organizationId, 'Identified By:', identifiedBy);
    return this.risksService.createRisk(createRiskDto, organizationId, identifiedBy);
  }

  @Get()
  @ApiOperation({ summary: 'Get all risks for organization' })
  @ApiResponse({ status: 200, description: 'Risks retrieved successfully', type: [RiskResponseDto] })
  async findAllRisks(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('status') status?: RiskStatus,
    @Query('severity') severity?: RiskSeverity,
  ): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    return this.risksService.findAllRisks(organizationId, projectId, status, severity);
  }

  @Get('matrix')
  @ApiOperation({ summary: 'Get risk matrix for organization' })
  @ApiResponse({ status: 200, description: 'Risk matrix retrieved successfully', type: RiskMatrixDto })
  async getRiskMatrix(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ): Promise<RiskMatrixDto> {
    const organizationId = req.user.organizationId;
    return this.risksService.getRiskMatrix(organizationId, projectId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get risk statistics for organization' })
  @ApiResponse({ status: 200, description: 'Risk statistics retrieved successfully', type: RiskStatsDto })
  async getRiskStats(@Request() req: any): Promise<RiskStatsDto> {
    const organizationId = req.user.organizationId;
    return this.risksService.getRiskStats(organizationId);
  }

  @Get('identify/:projectId')
  @ApiOperation({ summary: 'Identify risks for a project' })
  @ApiResponse({ status: 200, description: 'Risks identified successfully', type: [RiskResponseDto] })
  async identifyRisks(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    return this.risksService.identifyRisks(projectId, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific risk' })
  @ApiResponse({ status: 200, description: 'Risk retrieved successfully', type: RiskResponseDto })
  @ApiResponse({ status: 404, description: 'Risk not found' })
  async findOneRisk(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<RiskResponseDto> {
    const organizationId = req.user.organizationId;
    return this.risksService.findOneRisk(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a risk' })
  @ApiResponse({ status: 200, description: 'Risk updated successfully', type: RiskResponseDto })
  @ApiResponse({ status: 404, description: 'Risk not found' })
  async updateRisk(
    @Param('id') id: string,
    @Body() updateRiskDto: UpdateRiskDto,
    @Request() req: any,
  ): Promise<RiskResponseDto> {
    const organizationId = req.user.organizationId;
    return this.risksService.updateRisk(id, updateRiskDto, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a risk' })
  @ApiResponse({ status: 204, description: 'Risk deleted successfully' })
  @ApiResponse({ status: 404, description: 'Risk not found' })
  async deleteRisk(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const organizationId = req.user.organizationId;
    return this.risksService.deleteRisk(id, organizationId);
  }

  @Post(':id/assess')
  @ApiOperation({ summary: 'Assess risk impact' })
  @ApiResponse({ status: 200, description: 'Risk impact assessed successfully', type: RiskResponseDto })
  @ApiResponse({ status: 404, description: 'Risk not found' })
  async assessRiskImpact(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<RiskResponseDto> {
    const organizationId = req.user.organizationId;
    return this.risksService.assessRiskImpact(id, organizationId);
  }

  @Post(':id/mitigations')
  @ApiOperation({ summary: 'Create a mitigation for a risk' })
  @ApiResponse({ status: 201, description: 'Mitigation created successfully' })
  @ApiResponse({ status: 404, description: 'Risk not found' })
  async createMitigation(
    @Param('id') riskId: string,
    @Body() mitigationData: any,
    @Request() req: any,
  ): Promise<any> {
    const organizationId = req.user.organizationId;
    return this.risksService.createMitigation(riskId, mitigationData, organizationId);
  }

  // Risk type specific endpoints
  @Get('type/:type')
  @ApiOperation({ summary: 'Get risks by type' })
  @ApiResponse({ status: 200, description: 'Risks retrieved successfully', type: [RiskResponseDto] })
  async getRisksByType(
    @Param('type') type: RiskType,
    @Request() req: any,
  ): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    return this.risksService.findAllRisks(organizationId, undefined, undefined, undefined);
  }

  @Get('severity/:severity')
  @ApiOperation({ summary: 'Get risks by severity' })
  @ApiResponse({ status: 200, description: 'Risks retrieved successfully', type: [RiskResponseDto] })
  async getRisksBySeverity(
    @Param('severity') severity: RiskSeverity,
    @Request() req: any,
  ): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    return this.risksService.findAllRisks(organizationId, undefined, undefined, severity);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get risks by status' })
  @ApiResponse({ status: 200, description: 'Risks retrieved successfully', type: [RiskResponseDto] })
  async getRisksByStatus(
    @Param('status') status: RiskStatus,
    @Request() req: any,
  ): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    return this.risksService.findAllRisks(organizationId, undefined, status, undefined);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get risks for a specific project' })
  @ApiResponse({ status: 200, description: 'Risks retrieved successfully', type: [RiskResponseDto] })
  async getRisksByProject(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    return this.risksService.findAllRisks(organizationId, projectId);
  }

  @Get('high-priority/all')
  @ApiOperation({ summary: 'Get all high priority risks' })
  @ApiResponse({ status: 200, description: 'High priority risks retrieved successfully', type: [RiskResponseDto] })
  async getHighPriorityRisks(@Request() req: any): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    const allRisks = await this.risksService.findAllRisks(organizationId);
    return allRisks.filter(risk => risk.isHighPriority);
  }

  @Get('overdue/all')
  @ApiOperation({ summary: 'Get all overdue risks' })
  @ApiResponse({ status: 200, description: 'Overdue risks retrieved successfully', type: [RiskResponseDto] })
  async getOverdueRisks(@Request() req: any): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    const allRisks = await this.risksService.findAllRisks(organizationId);
    return allRisks.filter(risk => risk.isOverdue);
  }

  @Get('needs-attention/all')
  @ApiOperation({ summary: 'Get all risks that need attention' })
  @ApiResponse({ status: 200, description: 'Risks needing attention retrieved successfully', type: [RiskResponseDto] })
  async getRisksNeedingAttention(@Request() req: any): Promise<RiskResponseDto[]> {
    const organizationId = req.user.organizationId;
    const allRisks = await this.risksService.findAllRisks(organizationId);
    return allRisks.filter(risk => risk.needsAttention);
  }
}
