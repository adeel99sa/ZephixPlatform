import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectsService } from '../services/projects.service';
import { ProjectStatus } from '../entities/project.entity';

@ApiTags('projects')
@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('organization/statistics')
  @ApiOperation({ summary: 'Get organization project statistics' })
  async getOrganizationStatistics(@Req() req) {
    // Get all projects for statistics (set high limit)
    const result = await this.projectsService.findAllByOrganization(req.user.organizationId, 1, 1000);
    const projects = result.data;
    
    const totalProjects = result.total;
    const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
    const onHoldProjects = projects.filter(p => p.status === ProjectStatus.ON_HOLD).length;

    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalBudget,
      averageBudget: totalProjects > 0 ? totalBudget / totalProjects : 0,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  async create(@Body() createProjectDto: any, @Req() req) {
    return this.projectsService.create(createProjectDto, req.user.organizationId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  async findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.findAllByOrganization(
      req.user.organizationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  async findOne(@Param('id') id: string, @Req() req) {
    return this.projectsService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(@Param('id') id: string, @Body() updateProjectDto: any, @Req() req) {
    return this.projectsService.update(id, updateProjectDto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.projectsService.remove(id, req.user.organizationId);
  }
}
