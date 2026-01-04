import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  NotImplementedException,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkspaceScopeHelper } from '../../resources/helpers/workspace-scope.helper';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { PortfoliosService } from '../../portfolios/services/portfolios.service';
import { ProgramsService } from '../../programs/services/programs.service';
import { ResourcesService } from '../../resources/resources.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceConflict } from '../../resources/entities/resource-conflict.entity';
import { Project } from '../../projects/entities/project.entity';

@Controller('analytics/widgets')
@ApiTags('analytics-widgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsWidgetsController {
  constructor(
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly portfoliosService: PortfoliosService,
    private readonly programsService: ProgramsService,
    private readonly resourcesService: ResourcesService,
    private readonly projectsService: ProjectsService,
    @InjectRepository(ResourceConflict)
    private readonly conflictRepository: Repository<ResourceConflict>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  @Get('project-health')
  @ApiOperation({ summary: 'Get project health widget data' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: false })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: false })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Project health data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async getProjectHealth(
    @Req() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Require x-workspace-id header
    const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    // Get projects in workspace
    const projects = await this.projectRepository.find({
      where: { organizationId, workspaceId },
    });

    // Count conflicts by project
    const projectIds = projects.map((p) => p.id);
    const conflicts = projectIds.length > 0
      ? await this.conflictRepository.find({
          where: {
            organizationId,
          },
        })
      : [];

    // Extract project IDs from affectedProjects JSONB array
    const conflictCounts: Record<string, number> = {};
    conflicts.forEach((conflict) => {
      if (conflict.affectedProjects && Array.isArray(conflict.affectedProjects)) {
        conflict.affectedProjects.forEach((ap: any) => {
          if (ap.projectId && projectIds.includes(ap.projectId)) {
            conflictCounts[ap.projectId] = (conflictCounts[ap.projectId] || 0) + 1;
          }
        });
      }
    });

    const healthData = projects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      riskLevel: project.riskLevel,
      conflictCount: conflictCounts[project.id] || 0,
    }));

    return this.responseService.success(healthData);
  }

  @Get('sprint-metrics')
  @ApiOperation({ summary: 'Get sprint metrics widget data' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: false })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: false })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Sprint metrics data retrieved successfully' })
  @ApiResponse({ status: 501, description: 'Sprint data not configured' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async getSprintMetrics(
    @Req() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Require x-workspace-id header
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    // TODO: Implement sprint metrics when sprint data is configured
    throw new NotImplementedException('Sprint data not configured');
  }

  @Get('resource-utilization')
  @ApiOperation({ summary: 'Get resource utilization widget data' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Resource utilization data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async getResourceUtilization(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    // Require x-workspace-id header
    const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    const summary = await this.resourcesService.getCapacitySummary(
      organizationId,
      startDate,
      endDate,
      workspaceId,
      userId,
      platformRole,
    );

    return this.responseService.success(summary);
  }

  @Get('conflict-trends')
  @ApiOperation({ summary: 'Get conflict trends widget data' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Conflict trends data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async getConflictTrends(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    // Require x-workspace-id header
    const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    // Get conflicts in date range, grouped by week
    const conflicts = await this.conflictRepository
      .createQueryBuilder('conflict')
      .where('conflict.organizationId = :organizationId', { organizationId })
      .andWhere('conflict.detectedAt >= :startDate', { startDate: new Date(startDate) })
      .andWhere('conflict.detectedAt <= :endDate', { endDate: new Date(endDate) })
      .getMany();

    // Filter by workspace via affectedProjects (conflicts don't have direct workspaceId)
    // For now, include all conflicts in org - workspace filtering would require checking affectedProjects

    // Group by week (simplified - use week start date as key)
    const weekGroups = new Map<string, number>();
    conflicts.forEach((conflict) => {
      const date = new Date(conflict.detectedAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      weekGroups.set(weekKey, (weekGroups.get(weekKey) || 0) + 1);
    });

    const trends = Array.from(weekGroups.entries()).map(([week, count]) => ({
      week,
      count,
    }));

    return this.responseService.success(trends);
  }

  @Get('portfolio-summary')
  @ApiOperation({ summary: 'Get portfolio summary widget data' })
  @ApiQuery({ name: 'portfolioId', description: 'Portfolio ID', required: true })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Portfolio summary data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async getPortfolioSummary(
    @Query('portfolioId') portfolioId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    if (!portfolioId) {
      throw new BadRequestException('portfolioId is required');
    }

    // Require x-workspace-id header
    const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    const summary = await this.portfoliosService.getPortfolioSummary(
      portfolioId,
      workspaceId,
      startDate,
      endDate,
      organizationId,
    );

    return this.responseService.success(summary);
  }

  @Get('program-summary')
  @ApiOperation({ summary: 'Get program summary widget data' })
  @ApiQuery({ name: 'programId', description: 'Program ID', required: true })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Program summary data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async getProgramSummary(
    @Query('programId') programId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    if (!programId) {
      throw new BadRequestException('programId is required');
    }

    // Require x-workspace-id header
    const workspaceId = await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    const summary = await this.programsService.getProgramSummary(
      programId,
      workspaceId,
      startDate,
      endDate,
      organizationId,
    );

    return this.responseService.success(summary);
  }
}

