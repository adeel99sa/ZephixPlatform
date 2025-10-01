import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { UserWorkspace, WorkspaceRole } from './entities/user-workspace.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(UserWorkspace)
    private userWorkspaceRepository: Repository<UserWorkspace>,
  ) {}

  async create(createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    const workspace = this.workspaceRepository.create(createWorkspaceDto);
    const savedWorkspace = await this.workspaceRepository.save(workspace);
    
    // Add creator as owner
    await this.addUserToWorkspace(
      createWorkspaceDto.ownerId,
      savedWorkspace.id,
      WorkspaceRole.OWNER
    );
    
    return savedWorkspace;
  }

  async createWorkspaceWithOwner(name: string, organizationId: string, ownerId: string) {
    // Create workspace
    const workspace = await this.create({
      name,
      organizationId,
      ownerId
    });

    // Add owner to workspace
    await this.addUserToWorkspace(ownerId, workspace.id, WorkspaceRole.OWNER);

    return workspace;
  }

  async getUserRoleInWorkspace(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId }
    });

    return userWorkspace ? userWorkspace.role : null;
  }

  async ensureUserHasWorkspace(userId: string, organizationId: string) {
    const workspaces = await this.getUserWorkspaces(userId);
    
    if (workspaces.length === 0) {
      // Create default workspace for user
      const workspace = await this.createWorkspaceWithOwner(
        'My Workspace',
        organizationId,
        userId
      );
      
      return workspace;
    }
    
    return workspaces[0];
  }

  async findAll(organizationId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { organizationId, isActive: true },
      relations: ['owner', 'projects'],
    });
  }

  async findOne(id: string, organizationId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id, organizationId },
      relations: ['owner', 'projects'],
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

  async getUserWorkspaces(userId: string): Promise<any[]> {
    const userWorkspaces = await this.userWorkspaceRepository.find({
      where: { userId },
      relations: ['workspace'],
    });

    return userWorkspaces.map(uw => ({
      id: uw.workspace.id,
      name: uw.workspace.name,
      role: uw.role,
      organizationId: uw.workspace.organizationId
    }));
  }

  async addUserToWorkspace(userId: string, workspaceId: string, role: WorkspaceRole = WorkspaceRole.MEMBER) {
    const existing = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId }
    });

    if (existing) {
      return existing;
    }

    const userWorkspace = this.userWorkspaceRepository.create({
      userId,
      workspaceId,
      role
    });

    return await this.userWorkspaceRepository.save(userWorkspace);
  }

  async removeUserFromWorkspace(workspaceId: string, userId: string): Promise<void> {
    await this.userWorkspaceRepository.update(
      { workspaceId, userId },
      { isActive: false }
    );
  }

  async updateUserRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    await this.userWorkspaceRepository.update(
      { workspaceId, userId },
      { role }
    );
  }


  /**
   * Count workspaces by organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.workspaceRepository.count({
      where: { organizationId }
    });
  }
}



