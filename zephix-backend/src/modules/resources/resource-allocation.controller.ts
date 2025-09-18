import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceAllocationService } from './resource-allocation.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { AuthenticatedRequest } from './dto/authenticated-request.dto';

@Controller('resource-allocations')
@ApiTags('resource-allocations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourceAllocationController {
  constructor(private readonly allocationService: ResourceAllocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource allocation' })
  @ApiResponse({ status: 201, description: 'Resource allocation created successfully' })
  async create(@Body() createAllocationDto: CreateAllocationDto, @Req() req: AuthenticatedRequest) {
    return this.allocationService.create(createAllocationDto, req.user.organizationId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resource allocations' })
  @ApiResponse({ status: 200, description: 'Resource allocations retrieved successfully' })
  async findAll(@Req() req: AuthenticatedRequest, @Query('resourceId') resourceId?: string, @Query('projectId') projectId?: string) {
    return this.allocationService.findAll(req.user.organizationId, resourceId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resource allocation' })
  @ApiResponse({ status: 200, description: 'Resource allocation retrieved successfully' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.allocationService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resource allocation' })
  @ApiResponse({ status: 200, description: 'Resource allocation updated successfully' })
  async update(@Param('id') id: string, @Body() updateAllocationDto: UpdateAllocationDto, @Req() req: AuthenticatedRequest) {
    return this.allocationService.update(id, updateAllocationDto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resource allocation' })
  @ApiResponse({ status: 200, description: 'Resource allocation deleted successfully' })
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.allocationService.remove(id, req.user.organizationId);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Get all allocations for a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource allocations retrieved successfully' })
  async findByResource(@Param('resourceId') resourceId: string, @Req() req: AuthenticatedRequest) {
    return this.allocationService.findByResource(resourceId, req.user.organizationId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all allocations for a specific project' })
  @ApiResponse({ status: 200, description: 'Project allocations retrieved successfully' })
  async findByProject(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest) {
    return this.allocationService.findByProject(projectId, req.user.organizationId);
  }
}