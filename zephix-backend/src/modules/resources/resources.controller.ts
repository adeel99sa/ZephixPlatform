import { Controller, Get, Post, Query, UseGuards, Req, Body, BadRequestException, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationContextGuard } from '../../guards/organization-context.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { DetectConflictsDto } from './dto/detect-conflicts.dto';
import { AuthenticatedRequest } from './dto/authenticated-request.dto';
import { UpdateResourceThresholdDto } from './dto/resource-threshold.dto';
import { ResourcesService } from './resources.service';
import { AuditService } from './services/audit.service';
import { CacheService } from '../cache/cache.service';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResponseService } from '../../shared/services/response.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard, OrganizationContextGuard, OrganizationValidationGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(
    private readonly heatMapService: ResourceHeatMapService,
    private readonly resourcesService: ResourcesService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly allocationService: ResourceAllocationService,
    private readonly responseService: ResponseService
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
      const organizationId = req.organizationId;
      
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
        createdBy: userId
      }, organizationId);

      // Log audit
      if (userId && organizationId) {
        await this.auditService.logAction({
          userId: userId,
          organizationId: organizationId,
          entityType: 'resources',
          entityId: resource.id,
          action: 'create',
          newValue: createResourceDto,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        }).catch(err => {
          console.error('Audit log failed:', err);
        });
      }

      return resource;
    } catch (error) {
      console.error('❌ Create resource error:', error);
      throw new BadRequestException('Failed to create resource');
    }
  }

  @Get(':id/allocation')
  @ApiOperation({ summary: 'Get resource allocation for a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource allocation retrieved successfully' })
  async getResourceAllocation(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any
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
        organizationId
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
    const organizationId = req.organizationId;
    if (!organizationId) {
      return { data: [] };
    }
    return this.resourcesService.getConflicts(organizationId);
  }

  @Post('detect-conflicts')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 checks per minute
  @ApiOperation({ summary: 'Detect resource conflicts for allocation' })
  @ApiResponse({ status: 200, description: 'Conflict detection completed' })
  async detectConflicts(@Body() dto: DetectConflictsDto, @Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    
    return this.resourcesService.detectConflicts(
      dto.resourceId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.allocationPercentage,
      organizationId
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

  @Get('task-heat-map')
  @UseGuards(JwtAuthGuard)
  async getTaskHeatMap(@Req() req) {
    return await this.allocationService.getTaskBasedHeatMap(
      req.organizationId
    );
  }

  @Get('my-capacity')
  @ApiOperation({ summary: 'Get current user capacity' })
  @ApiResponse({ status: 200, description: 'User capacity retrieved successfully' })
  async getMyCapacity(@Req() req: any) {
    const userEmail = req.user?.email;
    const organizationId = req.user?.organizationId;
    
    if (!userEmail || !organizationId) {
      throw new BadRequestException('User email and organization ID are required');
    }

    // Calculate capacity based on assigned tasks
    const capacity = await this.resourcesService.calculateUserCapacity(userEmail, organizationId);
    return { capacityPercentage: capacity };
  }

  @Get('by-skill')
  @ApiOperation({ summary: 'Get resources by skill' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async getResourcesBySkill(
    @Query('skill') skill: string,
    @Req() req: any
  ) {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      if (!skill) {
        throw new BadRequestException('Skill parameter is required');
      }

      const result = await this.resourcesService.getResourcesBySkill(skill, organizationId);
      return this.responseService.success(result);
    } catch (error) {
      console.error('❌ Get resources by skill error:', error);
      throw new BadRequestException('Failed to get resources by skill');
    }
  }

  @Get('availability/:id')
  @ApiOperation({ summary: 'Check resource availability' })
  @ApiResponse({ status: 200, description: 'Resource availability retrieved successfully' })
  async checkResourceAvailability(
    @Param('id') id: string,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Req() req: any
  ) {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      if (!startDate || !endDate) {
        throw new BadRequestException('Start date and end date are required');
      }

      const result = await this.resourcesService.checkResourceAvailability(
        id,
        new Date(startDate),
        new Date(endDate),
        organizationId
      );

      return this.responseService.success(result);
    } catch (error) {
      console.error('❌ Check resource availability error:', error);
      throw new BadRequestException('Failed to check resource availability');
    }
  }

  @Get('utilization/:id')
  @ApiOperation({ summary: 'Get resource utilization' })
  @ApiResponse({ status: 200, description: 'Resource utilization retrieved successfully' })
  async getResourceUtilization(
    @Param('id') id: string,
    @Query('period') period: string = 'month',
    @Req() req: any
  ) {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const result = await this.resourcesService.getResourceUtilization(
        id,
        period,
        organizationId
      );

      return this.responseService.success(result);
    } catch (error) {
      console.error('❌ Get resource utilization error:', error);
      throw new BadRequestException('Failed to get resource utilization');
    }
  }

  @Post('allocate/:id')
  @ApiOperation({ summary: 'Allocate resource to project' })
  @ApiResponse({ status: 201, description: 'Resource allocated successfully' })
  async allocateResource(
    @Param('id') resourceId: string,
    @Body() allocationData: any,
    @Req() req: any
  ) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id || req.user?.sub;
      
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Validate required fields
      if (!allocationData.projectId || !allocationData.startDate || !allocationData.endDate || !allocationData.allocationPercentage) {
        throw new BadRequestException('Project ID, start date, end date, and allocation percentage are required');
      }

      const allocationDto = {
        resourceId,
        projectId: allocationData.projectId,
        userId: allocationData.userId || userId,
        startDate: allocationData.startDate,
        endDate: allocationData.endDate,
        allocationPercentage: allocationData.allocationPercentage,
        organizationId
      };

      const result = await this.resourcesService.createAllocationWithAudit(
        allocationDto,
        {
          userId,
          organizationId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      return this.responseService.success(result);
    } catch (error) {
      console.error('❌ Allocate resource error:', error);
      throw new BadRequestException('Failed to allocate resource');
    }
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint for resources module' })
  @ApiResponse({ status: 200, description: 'Resources module is working' })
  async test() {
    return { message: 'Resources module is working!', timestamp: new Date() };
  }

  @Get('test-conflicts')
  @ApiOperation({ summary: 'Get resource allocation conflicts (test endpoint)' })
  @ApiResponse({ status: 200, description: 'Resource conflicts retrieved successfully' })
  async getResourceConflictsTest() {
    console.log('🚨 TEST ENDPOINT CALLED');
    // Test endpoint that bypasses authentication for testing
    const testOrgId = '06b54693-2b4b-4c10-b553-6dea5c5631c9'; // Use the demo org ID
    const result = await this.resourcesService.checkResourceConflicts(testOrgId);
    console.log('🚨 TEST ENDPOINT RESULT:', result);
    return result;
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'Get resource allocation conflicts' })
  @ApiResponse({ status: 200, description: 'Resource conflicts retrieved successfully' })
  async getResourceConflicts(@Req() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.resourcesService.checkResourceConflicts(organizationId);
  }

  @Patch(':id/thresholds')
  @ApiOperation({ summary: 'Update resource allocation thresholds' })
  @ApiResponse({ status: 200, description: 'Resource thresholds updated successfully' })
  async updateThresholds(
    @Param('id') id: string,
    @Body() thresholds: UpdateResourceThresholdDto,
    @Req() req: any
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.resourcesService.updateResourceThresholds(id, thresholds, organizationId);
  }
}
