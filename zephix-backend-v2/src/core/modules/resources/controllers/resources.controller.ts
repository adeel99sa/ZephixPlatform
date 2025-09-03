import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourcesService } from '../services/resources.service';

@ApiTags('resources')
@Controller('api/v1/resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  async create(@Body() createDto: any, @Req() req) {
    return this.resourcesService.create(createDto, req.user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  async findAll(@Req() req) {
    return this.resourcesService.findAll(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by id' })
  async findOne(@Param('id') id: string, @Req() req) {
    return this.resourcesService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resource' })
  async update(@Param('id') id: string, @Body() updateDto: any, @Req() req) {
    return this.resourcesService.update(id, updateDto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.resourcesService.remove(id, req.user.organizationId);
  }

  @Post('allocate')
  @ApiOperation({ summary: 'Allocate resource to project/task' })
  async allocate(@Body() allocateDto: any, @Req() req) {
    return this.resourcesService.allocateResource(allocateDto, req.user.organizationId);
  }

  @Get('heat-map')
  @ApiOperation({ summary: 'Get resource utilization heat map' })
  async getHeatMap(@Req() req, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.resourcesService.getResourceHeatMap(
      req.user.organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'Get resource conflicts' })
  async getConflicts(@Req() req) {
    // To be implemented
    return [];
  }
}
