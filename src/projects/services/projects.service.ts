import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectAssignment } from '../entities/project-assignment.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectStatus, ProjectPriority } from '../../shared/enums/project.enums';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectAssignment)
    private readonly projectAssignmentRepository: Repository<ProjectAssignment>,
    private readonly ds: DataSource,
  ) {}

  async findAll() {
    try {
      const sql = `
        SELECT id, name, status, created_at
        FROM projects
        ORDER BY created_at DESC
        LIMIT 200
      `;
      const rows = await this.ds.query(sql);
      return rows ?? [];
    } catch (e: any) {
      this.logger.warn('DB issue in ProjectsService.findAll', e?.message ?? String(e));
      throw e; // controller will return safe payload
    }
  }

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
    const projectData = {
      name: createProjectDto.name,
      description: createProjectDto.description,
      status: createProjectDto.status || ProjectStatus.PLANNING,
      priority: createProjectDto.priority || ProjectPriority.MEDIUM,
      startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined,
      endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined,
      organizationId,
      created_by: userId,
      createdById: userId,
    };
    
    const project = this.projectRepository.create(projectData);

    const savedProject = await this.projectRepository.save(project);
    
    // Auto-assign creator as owner
    await this.assignUser(
      savedProject.id,
      userId,
      'owner',
      organizationId,
    );
    
    return savedProject;
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

  async assignUser(
    projectId: string,
    userId: string,
    role: string,
    organizationId: string,
  ): Promise<ProjectAssignment> {
    const assignment = this.projectAssignmentRepository.create({
      projectId,
      userId,
      role,
      organizationId,
      assignedAt: new Date(),
    });
    return this.projectAssignmentRepository.save(assignment);
  }

  async getProjectAssignments(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectAssignment[]> {
    return this.projectAssignmentRepository.find({
      where: { projectId, organizationId },
    });
  }

  async removeUser(
    projectId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    await this.projectAssignmentRepository.delete({
      projectId,
      userId,
      organizationId,
    });
  }
}
