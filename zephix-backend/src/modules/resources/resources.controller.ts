import { Controller, Get, Post, Query, UseGuards, Req, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  async getAllResources(@Req() req: any) {
    try {
      console.log('📍 Resources endpoint called');
      
      // Get user context
      const userId = req.user?.id || req.user?.sub;
      const organizationId = req.user?.organizationId;
      
      console.log('📍 User:', req.user?.email, 'Org:', organizationId);
      
      // Call service
      const result = await this.resourcesService.findAll(organizationId);
      
      // Only log audit if we have valid context
      if (userId && organizationId) {
        await this.auditService.logAction({
          userId: userId,
          organizationId: organizationId,
          entityType: 'resources',
          action: 'list',
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        }).catch(err => {
          console.error('Audit log failed:', err);
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Resources controller error:', error);
      throw new BadRequestException('Failed to fetch resources');
    }
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'Get resource conflicts' })
  @ApiResponse({ status: 200, description: 'Conflicts retrieved successfully' })
  async getConflicts(@Req() req: AuthenticatedRequest) {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return { data: [] };
    }
    return this.resourcesService.getConflicts(organizationId);
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
      dto.allocationPercentage
    );
  }

  @Post('allocations')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 creates per minute
  @ApiOperation({ summary: 'Create resource allocation with audit and cache invalidation' })
  @ApiResponse({ status: 201, description: 'Allocation created successfully' })
  async createAllocation(@Body() dto: CreateAllocationDto, @Req() req: AuthenticatedRequest) {
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
        }
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

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint for resources module' })
  @ApiResponse({ status: 200, description: 'Resources module is working' })
  async test() {
    return { message: 'Resources module is working!', timestamp: new Date() };
  }
}
