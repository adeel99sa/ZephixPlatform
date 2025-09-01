import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus, ProjectPriority } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async getOrganizationStats(organizationId: string) {
    const [totalProjects, activeProjects, completedProjects] = await Promise.all([
      this.projectRepository.count({ where: { organizationId } }),
      this.projectRepository.count({ where: { organizationId, status: ProjectStatus.ACTIVE } }),
      this.projectRepository.count({ where: { organizationId, status: ProjectStatus.COMPLETED } }),
    ]);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
    };
  }

  async createProject(createProjectDto: CreateProjectDto, organizationId: string, userId: string) {
    const project = this.projectRepository.create({
      ...createProjectDto,
      organizationId,
      created_by: userId,
      createdById: userId,
    });

    return this.projectRepository.save(project);
  }

  async findProjectById(id: string, organizationId: string) {
    const project = await this.projectRepository.findOne({
      where: { id, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async updateProject(id: string, updateProjectDto: UpdateProjectDto, organizationId: string, userId: string) {
    const project = await this.findProjectById(id, organizationId);
    
    // Check if user has permission to update (created by or admin)
    if (project.createdById !== userId) {
      throw new ForbiddenException('You can only update projects you created');
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async deleteProject(id: string, organizationId: string, userId: string) {
    const project = await this.findProjectById(id, organizationId);
    
    // Check if user has permission to delete (created by or admin)
    if (project.createdById !== userId) {
      throw new ForbiddenException('You can only delete projects you created');
    }

    await this.projectRepository.remove(project);
    return { message: 'Project deleted successfully' };
  }
}
