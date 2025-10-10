import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { OrganizationWorkspaceConfig } from './entities/organization-workspace-config.entity';
import { UserWorkspace, WorkspaceRole } from './entities/user-workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UpdateWorkspaceConfigDto } from './dto/update-workspace-config.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(OrganizationWorkspaceConfig)
    private configRepository: Repository<OrganizationWorkspaceConfig>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(createWorkspaceDto: CreateWorkspaceDto, organizationId: string): Promise<Workspace> {
    const workspace = this.workspaceRepository.create({
      ...createWorkspaceDto,
      organizationId
    });
    const savedWorkspace = await this.workspaceRepository.save(workspace);
    
    // TODO: Add user-workspace relationship when UserWorkspace entity is restored
    
    return savedWorkspace;
  }

  async createWorkspaceWithOwner(name: string, organizationId: string, ownerId: string) {
    // Create workspace
    const workspace = await this.create({
      name,
      organizationId,
      ownerId
    }, organizationId);

    // TODO: Add user-workspace relationship when UserWorkspace entity is restored

    return workspace;
  }

  async getUserRoleInWorkspace(userId: string, workspaceId: string, organizationId: string): Promise<WorkspaceRole | null> {
    // Verify workspace belongs to organization
    const workspace = await this.findOne(workspaceId, organizationId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    // Simplified implementation for now
    return WorkspaceRole.MEMBER;
  }

  async ensureUserHasWorkspace(userId: string, organizationId: string) {
    // Simplified implementation for now
    const workspaces = await this.findAll(organizationId);
    return workspaces[0] || null;
  }

  async findAll(organizationId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { organizationId, isActive: true },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  async update(id: string, updateWorkspaceDto: UpdateWorkspaceDto, organizationId: string): Promise<Workspace> {
    const workspace = await this.findOne(id, organizationId);
    
    Object.assign(workspace, updateWorkspaceDto);
    return this.workspaceRepository.save(workspace);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const workspace = await this.findOne(id, organizationId);
    
    // Soft delete by setting isActive to false
    workspace.isActive = false;
    await this.workspaceRepository.save(workspace);
  }

  async findByOrganization(organizationId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { organizationId, isActive: true },
      relations: ['projects'],
    });
  }

  async getUserWorkspaces(userId: string, organizationId: string): Promise<any[]> {
    // Simplified implementation for now - return workspaces for the organization
    return this.findAll(organizationId);
  }

  async addUserToWorkspace(userId: string, workspaceId: string, role: WorkspaceRole, organizationId: string) {
    // Verify workspace belongs to organization
    const workspace = await this.findOne(workspaceId, organizationId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    // Simplified implementation for now
    return { userId, workspaceId, role };
  }

  async removeUserFromWorkspace(workspaceId: string, userId: string, organizationId: string): Promise<void> {
    // Verify workspace belongs to organization
    const workspace = await this.findOne(workspaceId, organizationId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    // Simplified implementation for now
    return;
  }

  async updateUserRole(workspaceId: string, userId: string, role: WorkspaceRole, organizationId: string): Promise<void> {
    // Verify workspace belongs to organization
    const workspace = await this.findOne(workspaceId, organizationId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    // Simplified implementation for now
    return;
  }


  /**
   * Count workspaces by organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.workspaceRepository.count({
      where: { organizationId }
    });
  }

  // NEW: Hierarchy methods

  /**
   * Get organization's workspace configuration
   */
  async getOrganizationConfig(organizationId: string): Promise<any> {
    // Return default config for now
    return {
      organizationId,
      maxDepth: 2,
      level0Label: 'Workspace',
      level1Label: 'Sub-workspace',
      level2Label: 'Project',
      allowProjectsAtAllLevels: false,
    };
  }

  /**
   * Update organization's workspace configuration
   */
  async updateOrganizationConfig(
    organizationId: string, 
    updateDto: UpdateWorkspaceConfigDto
  ): Promise<any> {
    // Return updated config for now
    return {
      organizationId,
      maxDepth: updateDto.maxDepth || 2,
      level0Label: updateDto.level0Label || 'Workspace',
      level1Label: updateDto.level1Label || 'Sub-workspace',
      level2Label: updateDto.level2Label || 'Project',
      allowProjectsAtAllLevels: updateDto.allowProjectsAtAllLevels || false,
    };
  }

  /**
   * Create workspace with hierarchy validation
   */
  async createWithHierarchy(
    createDto: CreateWorkspaceDto, 
    userId: string, 
    organizationId: string
  ): Promise<Workspace> {
    // Simplified implementation for now
    const workspace = this.workspaceRepository.create({
      ...createDto,
      organizationId,
    });

    return this.workspaceRepository.save(workspace);
  }

  /**
   * Get workspace tree (children and descendants)
   */
  async getWorkspaceTree(workspaceId: string, organizationId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  /**
   * Get root workspaces (no parent)
   */
  async getRootWorkspaces(organizationId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get breadcrumb path for workspace
   */
  async getWorkspacePath(workspaceId: string, organizationId: string): Promise<Workspace[]> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return [workspace];
  }

  /**
   * Get workspace statistics for landing page
   */
  async getStats(workspaceId: string, organizationId: string) {
    // Verify workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Get projects in this workspace
    const projects = await this.projectRepository.find({
      where: { workspaceId, organizationId },
    });

    // Calculate stats
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    // Get completed this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const completedThisMonth = projects.filter(p => 
      p.status === 'completed' && 
      p.updatedAt && 
      new Date(p.updatedAt) >= thisMonth
    ).length;

    // Get upcoming deadlines (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingDeadlines = projects.filter(p => 
      p.endDate && 
      new Date(p.endDate) <= nextWeek && 
      p.status !== 'completed'
    ).length;

    // Get recent projects (last 5, sorted by updated date)
    const recentProjects = projects
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        updatedAt: p.updatedAt,
        folderId: p.folderId,
      }));

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        isOwner: true, // TODO: Check if current user is owner
      },
      stats: {
        activeProjects,
        completedThisMonth,
        upcomingDeadlines,
        totalProjects: projects.length,
        completedProjects,
      },
      recentProjects, // Include actual project names
      recentActivity: [], // TODO: Implement recent activity feed
    };
  }
}



