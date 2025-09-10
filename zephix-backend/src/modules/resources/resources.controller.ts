import { Controller, Get, Post, Query, UseGuards, Req, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceHeatMapService } from './services/resource-heat-map.service';
import { HeatMapQueryDto } from './dto/heat-map-query.dto';
import { ResourcesService } from './resources.service';

@Controller('resources')
@ApiTags('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(
    private readonly heatMapService: ResourceHeatMapService,
    private readonly resourcesService: ResourcesService
  ) {}

  @Get('heat-map')
  @ApiOperation({ summary: 'Get resource allocation heat map data' })
  @ApiResponse({ status: 200, description: 'Heat map data retrieved successfully' })
  async getResourceHeatMap(@Query() query: HeatMapQueryDto) {
    return this.heatMapService.getHeatMapData(query);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources for organization' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async getAllResources(@Req() req: any) {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      // Return empty array for users without organization
      // This allows the frontend to load without errors
      return { data: [] };
    }
    return this.resourcesService.findAll(organizationId);
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
  @ApiOperation({ summary: 'Create resource allocation' })
  @ApiResponse({ status: 201, description: 'Allocation created successfully' })
  async createAllocation(@Body() body: any, @Req() req: any) {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization');
    }
    return this.resourcesService.createAllocation({
      ...body,
      organizationId
    });
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint for resources module' })
  @ApiResponse({ status: 200, description: 'Resources module is working' })
  async test() {
    return { message: 'Resources module is working!', timestamp: new Date() };
  }
}
