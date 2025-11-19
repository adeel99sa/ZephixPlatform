import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  Body,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { ResourceListQueryDto } from './dto/resource-list-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { DetectConflictsDto } from './dto/detect-conflicts.dto';
import { AuthenticatedRequest } from './dto/authenticated-request.dto';
import { ResourcesService } from './resources.service';
import { AuditService } from './services/audit.service';
import { CacheService } from '../cache/cache.service';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourceRiskScoreService } from './services/resource-risk-score.service';
import { ResponseService } from '../../shared/services/response.service';
import { NotFoundException } from '@nestjs/common';
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
    private readonly cacheService: CacheService,
    private readonly allocationService: ResourceAllocationService,
    private readonly riskScoreService: ResourceRiskScoreService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('heat-map')
  @ApiOperation({ summary: 'Get resource allocation heat map data' })
  @ApiResponse({
    status: 200,
    description: 'Heat map data retrieved successfully',
  })
  async getResourceHeatMap(@Query() query: HeatMapQueryDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const userRole = req.user?.role;
    const organizationId = req.user?.organizationId;

    // Ensure organizationId is set in query if not provided
    if (!query.organizationId && organizationId) {
      query.organizationId = organizationId;
    }

    return this.heatMapService.getHeatMapData(query, userId, userRole);
  }

  @Get()
  async getAllResources(@Query() query: any, @Req() req: any) {
    try {
      console.log('📍 Resources endpoint called');

      // Get user context
      const userId = req.user?.id || req.user?.sub;
      const organizationId = req.user?.organizationId;
      const userRole = req.user?.role;

      console.log('📍 User:', req.user?.email, 'Org:', organizationId);

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
  async createResource(@Body() createResourceDto: any, @Req() req: any) {
    try {
      const userId = req.user?.id || req.user?.sub;
      const organizationId = req.user?.organizationId;

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
    @Req() req: any,
  ) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id || req.user?.sub;
      const userRole = req.user?.role;

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
    @Req() req: any,
  ) {
    try {
      const organizationId = req.user?.organizationId;

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

  @Get('conflicts')
  @ApiOperation({ summary: 'Get resource conflicts' })
  @ApiResponse({ status: 200, description: 'Conflicts retrieved successfully' })
  async getConflicts(@Req() req: AuthenticatedRequest) {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (!organizationId) {
      return { data: [] };
    }
    return this.resourcesService.getConflicts(organizationId, userId, userRole);
  }

  @Post('detect-conflicts')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 checks per minute
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
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 creates per minute
  @ApiOperation({
    summary: 'Create resource allocation with audit and cache invalidation',
  })
  @ApiResponse({ status: 201, description: 'Allocation created successfully' })
  async createAllocation(
    @Body() dto: CreateAllocationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const requestId = uuidv4();
    const organizationId = req.user?.organizationId;

    try {
      // 1. Create allocation
      const result = await this.resourcesService.createAllocationWithAudit(
        dto,
        {
          userId: req.user.id,
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
        userId: req.user.id,
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
        userId: req.user.id,
        organizationId,
        entityType: 'resource_allocation',
        action: 'create_failed',
        newValue: { error: error.message, data: dto },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });
      throw error;
    }
  }

  @Get('task-heat-map')
  @UseGuards(JwtAuthGuard)
  async getTaskHeatMap(@Req() req) {
    return await this.allocationService.getTaskBasedHeatMap(
      req.user.organizationId,
    );
  }

  @Get('my-capacity')
  @ApiOperation({ summary: 'Get current user capacity' })
  @ApiResponse({
    status: 200,
    description: 'User capacity retrieved successfully',
  })
  async getMyCapacity(@Req() req: any) {
    const userEmail = req.user?.email;
    const organizationId = req.user?.organizationId;

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
  async getCapacitySummary(@Query() query: any, @Req() req: any) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id || req.user?.sub;
      const userRole = req.user?.role;

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
  async getSkillsFacet(@Req() req: any) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id || req.user?.sub;
      const userRole = req.user?.role;

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

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint for resources module' })
  @ApiResponse({ status: 200, description: 'Resources module is working' })
  async test() {
    return { message: 'Resources module is working!', timestamp: new Date() };
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
    @Req() req: any,
  ) {
    // Check feature flag
    const featureFlagEnabled =
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 === 'true';
    if (!featureFlagEnabled) {
      throw new NotFoundException('Endpoint not available');
    }

    const organizationId = req.user?.organizationId;
    const userId = req.user?.id || req.user?.sub;
    const userRole = req.user?.role;

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
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Get resource risk score error:', error);
      throw new BadRequestException('Failed to get resource risk score');
    }
  }
}
