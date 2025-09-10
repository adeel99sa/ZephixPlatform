import { Controller, Get, Post, Query, UseGuards, Req, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';
import { ResourcesService } from './resources.service';
import { AuditService } from './services/audit.service';
import { CacheService } from '../cache/cache.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(
    private readonly heatMapService: ResourceHeatMapService,
    private readonly resourcesService: ResourcesService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService
  ) {}

  @Get('heat-map')
  @ApiOperation({ summary: 'Get resource allocation heat map data' })
  @ApiResponse({ status: 200, description: 'Heat map data retrieved successfully' })
  async getResourceHeatMap(@Query() query: HeatMapQueryDto) {
    return this.heatMapService.getHeatMapData(query);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources for organization with caching and audit' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async getAllResources(@Req() req: any) {
    const requestId = uuidv4();
    const organizationId = req.user?.organizationId;
    
    // 1. Validate organization
    if (!organizationId) {
      await this.auditService.logAction({
        userId: req.user?.id || 'unknown',
        organizationId: 'none',
        entityType: 'resources',
        action: 'list_failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });
      return { data: [] };
    }

    // 2. Check cache first
    const cacheKey = `resources:${organizationId}`;
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      // Log cache hit
      await this.auditService.logAction({
        userId: req.user.id,
        organizationId,
        entityType: 'resources',
        action: 'list_cached',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });
      return cached;
    }

    // 3. Get from database
    const resources = await this.resourcesService.findAll(organizationId);
    
    // 4. Cache the result
    await this.cacheService.set(cacheKey, resources, 300); // 5 minutes
    
    // 5. Log the access
    await this.auditService.logAction({
      userId: req.user.id,
      organizationId,
      entityType: 'resources',
      action: 'list',
      newValue: { count: resources.data?.length || 0 },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId,
    });

    return resources;
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'Get resource conflicts' })
  @ApiResponse({ status: 200, description: 'Conflicts retrieved successfully' })
  async getConflicts(@Req() req: any) {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return { data: [] };
    }
    return this.resourcesService.getConflicts(organizationId);
  }

  @Post('detect-conflicts')
  @ApiOperation({ summary: 'Detect resource conflicts for allocation' })
  @ApiResponse({ status: 200, description: 'Conflict detection completed' })
  async detectConflicts(@Body() body: any) {
    if (!body.resourceId || !body.startDate || !body.endDate || !body.allocationPercentage) {
      throw new BadRequestException('Missing required fields: resourceId, startDate, endDate, allocationPercentage');
    }
    return this.resourcesService.detectConflicts(
      body.resourceId,
      new Date(body.startDate),
      new Date(body.endDate),
      body.allocationPercentage
    );
  }

  @Post('allocations')
  @ApiOperation({ summary: 'Create resource allocation with audit and cache invalidation' })
  @ApiResponse({ status: 201, description: 'Allocation created successfully' })
  async createAllocation(@Body() body: any, @Req() req: any) {
    const requestId = uuidv4();
    const organizationId = req.user?.organizationId;

    try {
      // 1. Create allocation
      const result = await this.resourcesService.createAllocation({
        ...body,
        organizationId,
      });

      // 2. Invalidate cache
      await this.cacheService.delete(`resources:${organizationId}`);
      await this.cacheService.delete(`allocations:${organizationId}`);

      // 3. Log successful creation
      await this.auditService.logAction({
        userId: req.user.id,
        organizationId,
        entityType: 'resource_allocation',
        entityId: result.id,
        action: 'create',
        newValue: body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });

      return result;
    } catch (error) {
      // 4. Log failure
      await this.auditService.logAction({
        userId: req.user.id,
        organizationId,
        entityType: 'resource_allocation',
        action: 'create_failed',
        newValue: { error: error.message, data: body },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });
      throw error;
    }
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint for resources module' })
  @ApiResponse({ status: 200, description: 'Resources module is working' })
  async test() {
    return { message: 'Resources module is working!', timestamp: new Date() };
  }
}
