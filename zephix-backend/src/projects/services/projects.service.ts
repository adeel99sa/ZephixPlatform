import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findOne(id: string) {
    return this.projectRepository.findOne({ where: { id } });
  }

  async getOrganizationStats(organizationId: string) {
    // Simple approach: get all projects and filter in memory
    const projects = await this.projectRepository.find({
      where: { organizationId }
    });
    
    return {
      totalProjects: projects.length,
      planningProjects: projects.filter(p => p.status === ProjectStatus.PLANNING).length,
      activeProjects: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
      completedProjects: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
      onHoldProjects: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length,
    };
  }

  async createProject(createProjectDto: CreateProjectDto, organizationId: string, userId: string) {
    const project = this.projectRepository.create({
      ...createProjectDto,
      organizationId,
      createdById: userId,
    });
    return this.projectRepository.save(project);
  }

  async findAllProjects(organizationId: string, options: any = {}) {
    const projects = await this.projectRepository.find({
      where: { organizationId },
    });
    
    return {
      projects,
      total: projects.length,
      page: 1,
      totalPages: 1,
    };
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
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async deleteProject(id: string, organizationId: string, userId: string) {
    const project = await this.findProjectById(id, organizationId);
    await this.projectRepository.remove(project);
  }

  async validateProjectAccess(projectId: string, organizationId: string) {
    return this.findProjectById(projectId, organizationId);
  }
}