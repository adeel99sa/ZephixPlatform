import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';
import { ProjectStatus } from '../entities/project.entity';

@Controller({ path: 'projects', version: '1' })
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('organization/statistics')
  async getOrganizationStatistics(@CurrentOrg() organizationId: string) {
    const projects = await this.projectsService.findAllByOrganization(organizationId);
    
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
    const onHoldProjects = projects.filter(p => p.status === ProjectStatus.ON_HOLD).length;
    
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const avgBudget = totalProjects > 0 ? totalBudget / totalProjects : 0;
    
    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
      },
      budget: {
        total: totalBudget,
        average: avgBudget,
      },
      timeline: {
        onTime: Math.floor(totalProjects * 0.7),
        delayed: Math.floor(totalProjects * 0.2),
        atRisk: Math.floor(totalProjects * 0.1),
      },
      resources: {
        totalAllocated: 0,
        utilization: 0,
      }
    };
  }

  @Post()
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.create(createProjectDto, organizationId, user.id);
  }

  @Get()
  findAll(@CurrentOrg() organizationId: string) {
    return this.projectsService.findAllByOrganization(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() organizationId: string) {
    return this.projectsService.findOne(id, organizationId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: CreateProjectDto,
    @CurrentOrg() organizationId: string,
  ) {
    return this.projectsService.update(id, updateProjectDto, organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() organizationId: string) {
    return this.projectsService.remove(id, organizationId);
  }
}
