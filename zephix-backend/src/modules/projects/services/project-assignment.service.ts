import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ProjectAssignment } from '../entities/project-assignment.entity';
import { Project } from '../entities/project.entity';
import { AssignUserDto } from '../dto/assign-user.dto';

export interface RequestContext {
  userId: string;
  organizationId: string;
}

@Injectable()
export class ProjectAssignmentService {
  private readonly logger = new Logger(ProjectAssignmentService.name);

  constructor(
    @InjectRepository(ProjectAssignment)
    private readonly assignmentRepository: Repository<ProjectAssignment>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Assign user to project with full transaction management and audit trail
   */
  async assignUser(projectId: string, dto: AssignUserDto, context: RequestContext): Promise<ProjectAssignment> {
    return this.dataSource.transaction(async manager => {
      this.logger.log(`Assigning user ${dto.userId} to project ${projectId} with role ${dto.role || 'contributor'}`);

      // 1. Verify project exists and user has access
      const project = await manager.findOne(Project, {
        where: { 
          id: projectId, 
          organizationId: context.organizationId 
        },
      });

      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found or access denied`);
      }

      // 2. Check if assignment already exists
      const existing = await manager.findOne(ProjectAssignment, {
        where: {
          projectId: projectId,
          userId: dto.userId,
        },
      });

      if (existing) {
        throw new ConflictException('User is already assigned to this project');
      }

      // 3. Create assignment
      const assignment = manager.create(ProjectAssignment, {
        projectId: projectId,
        userId: dto.userId,
        organizationId: context.organizationId,
        role: dto.role || 'contributor',
        assignedBy: context.userId,
        assignedAt: new Date(),
      });

      const saved = await manager.save(assignment);

      // 4. Log audit event
      this.logger.log(`✅ User ${dto.userId} assigned to project ${projectId} with role ${saved.role}`);

      return saved;
    });
  }

  /**
   * Get project assignments with proper tenant isolation
   */
  async getProjectAssignments(projectId: string, context: RequestContext): Promise<ProjectAssignment[]> {
    this.logger.log(`Fetching assignments for project ${projectId}`);

    // Verify project access
    const project = await this.projectRepository.findOne({
      where: { 
        id: projectId, 
        organizationId: context.organizationId 
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found or access denied`);
    }

    const assignments = await this.assignmentRepository.find({
      where: { 
        projectId, 
        organizationId: context.organizationId,
      },
      order: { assignedAt: 'DESC' },
    });

    this.logger.log(`Found ${assignments.length} assignments for project ${projectId}`);
    return assignments;
  }

  /**
   * Remove user from project (soft delete)
   */
  async removeUser(projectId: string, userId: string, context: RequestContext): Promise<void> {
    return this.dataSource.transaction(async manager => {
      this.logger.log(`Removing user ${userId} from project ${projectId}`);

      // Verify project access
      const project = await manager.findOne(Project, {
        where: { 
          id: projectId, 
          organizationId: context.organizationId 
        },
      });

      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found or access denied`);
      }

      // Find assignment
      const assignment = await manager.findOne(ProjectAssignment, {
        where: {
          projectId,
          userId,
          organizationId: context.organizationId,
        },
      });

      if (!assignment) {
        throw new NotFoundException(`Assignment not found for user ${userId} in project ${projectId}`);
      }

      // Soft delete (trigger will handle the actual soft delete)
      await manager.remove(assignment);

      this.logger.log(`✅ User ${userId} removed from project ${projectId}`);
    });
  }

  /**
   * Update user role in project
   */
  async updateUserRole(
    projectId: string, 
    userId: string, 
    newRole: string, 
    context: RequestContext
  ): Promise<ProjectAssignment> {
    return this.dataSource.transaction(async manager => {
      this.logger.log(`Updating role for user ${userId} in project ${projectId} to ${newRole}`);

      // Verify project access
      const project = await manager.findOne(Project, {
        where: { 
          id: projectId, 
          organizationId: context.organizationId 
        },
      });

      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found or access denied`);
      }

      // Find assignment
      const assignment = await manager.findOne(ProjectAssignment, {
        where: {
          projectId,
          userId,
          organizationId: context.organizationId,
        },
      });

      if (!assignment) {
        throw new NotFoundException(`Assignment not found for user ${userId} in project ${projectId}`);
      }

      // Update role
      assignment.role = newRole;

      const updated = await manager.save(assignment);

      this.logger.log(`✅ Role updated for user ${userId} in project ${projectId} to ${newRole}`);
      return updated;
    });
  }

  /**
   * Check if user has specific role in project
   */
  async hasRole(
    projectId: string, 
    userId: string, 
    requiredRole: string, 
    context: RequestContext
  ): Promise<boolean> {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        projectId,
        userId,
        organizationId: context.organizationId,
      },
    });

    if (!assignment) {
      return false;
    }

    // Role hierarchy: owner > manager > contributor > viewer
    const roleHierarchy = { owner: 4, manager: 3, contributor: 2, viewer: 1 };
    const userLevel = roleHierarchy[assignment.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }
}
