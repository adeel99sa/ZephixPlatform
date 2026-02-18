import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UseGuards,
  Req,
  Body,
  BadRequestException,
  Param,
  SetMetadata,
} from '@nestjs/common';
import { ResourceListQueryDto } from './dto/resource-list-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { DetectConflictsDto } from './dto/detect-conflicts.dto';
import { ResourcesService } from './resources.service';
import { AuditService } from './services/audit.service';
import { CacheService } from '../cache/cache.service';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourceRiskScoreService } from './services/resource-risk-score.service';
import { ResourceTimelineService } from './services/resource-timeline.service';
import { ResponseService } from '../../shared/services/response.service';
import { NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkspaceScopeHelper } from './helpers/workspace-scope.helper';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(
    private readonly heatMapService: ResourceHeatMapService,
    private readonly resourcesService: ResourcesService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly allocationService: ResourceAllocationService,
    private readonly riskScoreService: ResourceRiskScoreService,
    private readonly timelineService: ResourceTimelineService,
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @Get('heat-map')
  @ApiOperation({ summary: 'Get resource allocation heat map data' })
  @ApiResponse({
    status: 200,
    description: 'Heat map data retrieved successfully',
  })
  async getResourceHeatMap(
    @Query() query: HeatMapQueryDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, platformRole } = getAuthContext(req);
    const userRole = platformRole;

    // organizationId now comes from tenant context (set by interceptor)
    // No need to pass it explicitly

    return this.heatMapService.getHeatMapData(query, userId, userRole);
  }

  @Get()
  async getAllResources(@Query() query: any, @Req() req: AuthRequest) {
    try {
      console.log('📍 Resources endpoint called');

      // Get user context
      const { userId, organizationId, email, platformRole } =
        getAuthContext(req);
      const userRole = platformRole;

      console.log('📍 User:', email, 'Org:', organizationId);

      // Parse filter query parameters
      const filters: any = {};

      // Parse skills (can be comma-separated string or array)
      if (query.skills) {
        filters.skills = Array.isArray(query.skills)
          ? query.skills
          : query.skills.split(',').map((s: string) => s.trim());
      }

      // Parse roles (can be comma-separated string or array)
      if (query.roles) {
        filters.roles = Array.isArray(query.roles)
          ? query.roles
          : query.roles.split(',').map((r: string) => r.trim());
      }

      // Parse workspaceId
      if (query.workspaceId) {
        filters.workspaceId = query.workspaceId;
      }

      // Parse date range
      if (query.dateFrom) {
        filters.dateFrom = query.dateFrom;
      }
      if (query.dateTo) {
        filters.dateTo = query.dateTo;
      }

      // Call service with user context and filters
      const result = await this.resourcesService.findAll(
        organizationId,
        userId,
        userRole,
        Object.keys(filters).length > 0 ? filters : undefined,
      );

      // Only log audit if we have valid context
      if (userId && organizationId) {
        await this.auditService
          .logAction({
            userId: userId,
            organizationId: organizationId,
            entityType: 'resources',
            action: 'list',
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
          })
          .catch((err) => {
            console.error('Audit log failed:', err);
          });
      }

      return this.responseService.success(result);
    } catch (error) {
      console.error('❌ Resources controller error:', error);
      throw new BadRequestException('Failed to fetch resources');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  async createResource(
    @Body() createResourceDto: any,
    @Req() req: AuthRequest,
  ) {
    try {
      const { userId, organizationId } = getAuthContext(req);

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const resource = await this.resourcesService.create({
        ...createResourceDto,
        organizationId,
        createdBy: userId,
      });

      // Log audit
      if (userId && organizationId) {
        await this.auditService
          .logAction({
            userId: userId,
            organizationId: organizationId,
            entityType: 'resources',
            entityId: resource.id,
            action: 'create',
            newValue: createResourceDto,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
          })
          .catch((err) => {
            console.error('Audit log failed:', err);
          });
      }

      return resource;
    } catch (error) {
      console.error('❌ Create resource error:', error);
      throw new BadRequestException('Failed to create resource');
    }
  }

  // Static routes must come BEFORE dynamic routes to prevent route conflicts
  // e.g., /api/resources/conflicts should not match /api/resources/:id

  @Get('conflicts')
  @ApiOperation({
    summary: 'Get resource conflicts (Phase 2: uses ResourceConflict entity)',
  })
  @ApiResponse({ status: 200, description: 'Conflicts retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async getConflicts(
    @Req() req: AuthRequest,
    @Query('workspaceId') workspaceIdQuery?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    if (!organizationId) {
      return { data: [] };
    }

    // Prefer workspaceId from tenant context (set by interceptor from x-workspace-id header)
    // Fall back to query param if not in context
    const workspaceId =
      this.tenantContextService.getWorkspaceId() || workspaceIdQuery;

    return this.resourcesService.getConflictsFromEntity(
      organizationId,
      workspaceId || undefined,
      resourceId,
      startDate,
      endDate,
      severity,
      resolved === 'true',
      userId,
      platformRole,
    );
  }

  @Patch('conflicts/:id/resolve')
  @ApiOperation({ summary: 'Resolve a resource conflict (Phase 3)' })
  @ApiResponse({ status: 200, description: 'Conflict resolved successfully' })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  async resolveConflict(
    @Param('id') id: string,
    @Body() body: { resolutionNote?: string },
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );

    return this.resourcesService.resolveConflict(
      id,
      organizationId,
      userId,
      body.resolutionNote,
    );
  }

  @Patch('conflicts/:id/reopen')
  @ApiOperation({ summary: 'Reopen a resolved conflict (Phase 3)' })
  @ApiResponse({ status: 200, description: 'Conflict reopened successfully' })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  async reopenConflict(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );

    return this.resourcesService.reopenConflict(id, organizationId, userId);
  }

  @Get('capacity/resources')
  @ApiOperation({
    summary: 'Get capacity view with weekly rollup per resource (Phase 2)',
  })
  @ApiResponse({
    status: 200,
    description: 'Capacity resources retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async getCapacityResources(
    @Req() req: AuthRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    try {
      const { organizationId } = getAuthContext(req);

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      if (!startDate || !endDate) {
        throw new BadRequestException('startDate and endDate are required');
      }

      const result = await this.resourcesService.getCapacityResources(
        organizationId,
        startDate,
        endDate,
        workspaceId,
      );

      return this.responseService.success(result);
    } catch (error) {
      console.error('❌ Get capacity resources error:', error);
      throw error;
    }
  }

  // Dynamic routes come AFTER all static routes
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  async getResource(@Param('id') id: string, @Req() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const resource = await this.resourcesService.findOne(id, organizationId);

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      return this.responseService.success(resource);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Get resource error:', error);
      throw new BadRequestException('Failed to get resource');
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resource' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully' })
  async updateResource(
    @Param('id') id: string,
    @Body() updateResourceDto: any,
    @Req() req: AuthRequest,
  ) {
    try {
      const { userId, organizationId } = getAuthContext(req);

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const resource = await this.resourcesService.update(
        id,
        updateResourceDto,
        organizationId,
      );

      // Log audit
      if (userId && organizationId) {
        await this.auditService
          .logAction({
            userId: userId,
            organizationId: organizationId,
            entityType: 'resources',
            entityId: resource.id,
            action: 'update',
            newValue: updateResourceDto,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
          })
          .catch((err) => {
            console.error('Audit log failed:', err);
          });
      }

      return this.responseService.success(resource);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Update resource error:', error);
      throw new BadRequestException('Failed to update resource');
    }
  }

  @Get(':id/capacity-breakdown')
  @ApiOperation({
    summary: 'Get capacity breakdown for a resource across projects',
  })
  @ApiResponse({
    status: 200,
    description: 'Capacity breakdown retrieved successfully',
  })
  async getCapacityBreakdown(
    @Param('id') resourceId: string,
    @Query() query: any,
    @Req() req: AuthRequest,
  ) {
    try {
      const { organizationId, userId, platformRole } = getAuthContext(req);
      const userRole = platformRole;

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      if (!query.dateFrom || !query.dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required');
      }

      const breakdown = await this.resourcesService.getCapacityBreakdown(
        resourceId,
        organizationId,
        query.dateFrom,
        query.dateTo,
        userId,
        userRole,
      );

      return this.responseService.success(breakdown);
    } catch (error) {
      console.error('❌ Get capacity breakdown error:', error);
      throw error;
    }
  }

  @Get(':id/allocation')
  @ApiOperation({ summary: 'Get resource allocation for a specific resource' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocation retrieved successfully',
  })
  async getResourceAllocation(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: AuthRequest,
  ) {
    try {
      const { organizationId } = getAuthContext(req);

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const allocation = await this.resourcesService.getResourceAllocation(
        id,
        startDate,
        endDate,
        organizationId,
      );

      return allocation;
    } catch (error) {
      console.error('❌ Get resource allocation error:', error);
      throw new BadRequestException('Failed to get resource allocation');
    }
  }

  @Post('detect-conflicts')
  @UseGuards(RateLimiterGuard)
  @SetMetadata('rateLimit', { windowMs: 60000, max: 50 })
  @ApiOperation({ summary: 'Detect resource conflicts for allocation' })
  @ApiResponse({ status: 200, description: 'Conflict detection completed' })
  async detectConflicts(@Body() dto: DetectConflictsDto) {
    return this.resourcesService.detectConflicts(
      dto.resourceId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.allocationPercentage,
    );
  }

  @Post('allocations')
  @UseGuards(RateLimiterGuard)
  @SetMetadata('rateLimit', { windowMs: 60000, max: 20 })
  @ApiOperation({
    summary: 'Create resource allocation with audit and cache invalidation',
  })
  @ApiResponse({ status: 201, description: 'Allocation created successfully' })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({
    status: 409,
    description: 'HARD allocation would exceed capacity',
  })
  async createAllocation(
    @Body() dto: CreateAllocationDto,
    @Req() req: AuthRequest,
  ) {
    const requestId = uuidv4();
    const { userId, organizationId, platformRole } = getAuthContext(req);

    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );

    try {
      // 1. Create allocation
      const result = await this.resourcesService.createAllocationWithAudit(
        dto,
        {
          userId,
          organizationId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      );

      // 2. Invalidate cache
      await this.cacheService.delete(`resources:${organizationId}`);
      await this.cacheService.delete(`allocations:${organizationId}`);

      // 3. Log successful creation
      await this.auditService.logAction({
        userId,
        organizationId,
        entityType: 'resource_allocation',
        entityId: result.id,
        action: 'create',
        newValue: dto,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });

      return result;
    } catch (error) {
      // 4. Log failure
      await this.auditService.logAction({
        userId,
        organizationId,
        entityType: 'resource_allocation',
        action: 'create_failed',
        newValue: {
          error: error instanceof Error ? error.message : String(error),
          data: dto,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });
      throw error;
    }
  }

  @Get('task-heat-map')
  @UseGuards(JwtAuthGuard)
  async getTaskHeatMap(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return await this.allocationService.getTaskBasedHeatMap(organizationId);
  }

  @Get('my-capacity')
  @ApiOperation({ summary: 'Get current user capacity' })
  @ApiResponse({
    status: 200,
    description: 'User capacity retrieved successfully',
  })
  async getMyCapacity(@Req() req: AuthRequest) {
    const { email: userEmail, organizationId } = getAuthContext(req);

    if (!userEmail || !organizationId) {
      throw new BadRequestException(
        'User email and organization ID are required',
      );
    }

    // Calculate capacity based on assigned tasks
    const capacity = await this.resourcesService.calculateUserCapacity(
      userEmail,
      organizationId,
    );
    return { capacityPercentage: capacity };
  }

  @Get('capacity-summary')
  @ApiOperation({ summary: 'Get capacity summary for resources' })
  @ApiResponse({
    status: 200,
    description: 'Capacity summary retrieved successfully',
  })
  async getCapacitySummary(@Query() query: any, @Req() req: AuthRequest) {
    try {
      const { organizationId, userId, platformRole } = getAuthContext(req);
      const userRole = platformRole;

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      if (!query.dateFrom || !query.dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required');
      }

      const summary = await this.resourcesService.getCapacitySummary(
        organizationId,
        query.dateFrom,
        query.dateTo,
        query.workspaceId,
        userId,
        userRole,
      );

      return this.responseService.success(summary);
    } catch (error) {
      console.error('❌ Get capacity summary error:', error);
      throw error;
    }
  }

  @Get('skills')
  @ApiOperation({ summary: 'Get skills facet with resource counts' })
  @ApiResponse({
    status: 200,
    description: 'Skills facet retrieved successfully',
  })
  async getSkillsFacet(@Req() req: AuthRequest) {
    try {
      const { organizationId, userId, platformRole } = getAuthContext(req);
      const userRole = platformRole;

      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const skills = await this.resourcesService.getSkillsFacet(
        organizationId,
        userId,
        userRole,
      );

      return this.responseService.success(skills);
    } catch (error) {
      console.error('❌ Get skills facet error:', error);
      throw error;
    }
  }

  @Get(':id/risk-score')
  @ApiOperation({ summary: 'Get resource risk score for conflict prediction' })
  @ApiResponse({
    status: 200,
    description: 'Risk score retrieved successfully',
  })
  async getResourceRiskScore(
    @Param('id') resourceId: string,
    @Query() query: any,
    @Req() req: AuthRequest,
  ) {
    // Check feature flag
    const featureFlagEnabled =
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 === 'true';
    if (!featureFlagEnabled) {
      throw new NotFoundException('Endpoint not available');
    }

    const { organizationId, userId, platformRole } = getAuthContext(req);
    const userRole = platformRole;

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const dateFrom = new Date(query.dateFrom);
    const dateTo = new Date(query.dateTo);

    try {
      const result = await this.riskScoreService.getResourceRiskScore({
        resourceId,
        organizationId,
        dateFrom,
        dateTo,
      });

      return this.responseService.success(result);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('❌ Get resource risk score error:', error);
      throw new BadRequestException('Failed to get resource risk score');
    }
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get resource timeline (daily load data)' })
  @ApiResponse({
    status: 200,
    description: 'Timeline data retrieved successfully',
  })
  async getResourceTimeline(
    @Param('id') resourceId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!fromDate || !toDate) {
      throw new BadRequestException(
        'fromDate and toDate query parameters are required',
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (from > to) {
      throw new BadRequestException('fromDate must be before toDate');
    }

    const timeline = await this.timelineService.getTimeline(
      resourceId,
      organizationId,
      from,
      to,
    );

    return this.responseService.success(
      timeline.map((day) => ({
        date: day.date.toISOString().split('T')[0],
        capacityPercent: day.capacityPercent,
        hardLoadPercent: day.hardLoadPercent,
        softLoadPercent: day.softLoadPercent,
        classification: day.classification,
      })),
    );
  }

  @Get('heatmap/timeline')
  @ApiOperation({ summary: 'Get heatmap data from timeline read model' })
  @ApiResponse({
    status: 200,
    description: 'Heatmap data retrieved successfully',
  })
  async getHeatmapFromTimeline(
    @Query('workspaceId') workspaceId: string | undefined,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!fromDate || !toDate) {
      throw new BadRequestException(
        'fromDate and toDate query parameters are required',
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (from > to) {
      throw new BadRequestException('fromDate must be before toDate');
    }

    const heatmap = await this.timelineService.getHeatmap(
      organizationId,
      workspaceId,
      from,
      to,
    );

    return this.responseService.success(heatmap);
  }
}
