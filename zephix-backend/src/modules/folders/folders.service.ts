import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from './entities/folder.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateFolderDto, UpdateFolderDto, MoveProjectDto, BulkMoveDto } from './dto';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private folderRepository: Repository<Folder>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(dto: CreateFolderDto, userId: string, orgId: string): Promise<Folder> {
    let depth = 0;

    // Validate parent folder exists and check depth
    if (dto.parentFolderId) {
      const parent = await this.folderRepository.findOne({
        where: { 
          id: dto.parentFolderId, 
          organizationId: orgId,
          deletedAt: IsNull()
        }
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }

      if (parent.hierarchyDepth >= 3) {
        throw new BadRequestException('Maximum folder depth (3 levels) reached');
      }

      depth = parent.hierarchyDepth + 1;
    }

    // Check for duplicate name in same parent
    const existing = await this.folderRepository.findOne({
      where: {
        workspaceId: dto.workspaceId,
        parentFolderId: dto.parentFolderId || IsNull(),
        name: dto.name,
        organizationId: orgId,
        deletedAt: IsNull()
      }
    });

    if (existing) {
      throw new BadRequestException('Folder with this name already exists in this location');
    }

    const folder = this.folderRepository.create({
      ...dto,
      organizationId: orgId,
      createdBy: userId,
      hierarchyDepth: depth,
    });

    return this.folderRepository.save(folder);
  }

  async findTree(workspaceId: string, orgId: string) {
    const folders = await this.folderRepository.find({
      where: { 
        workspaceId, 
        organizationId: orgId,
        deletedAt: IsNull()
      },
      relations: ['projects'],
      order: { displayOrder: 'ASC', name: 'ASC' }
    });

    // Also fetch unfoldered projects (projects with folderId: null in this workspace)
    const unfolderedProjects = await this.projectRepository.find({
      where: {
        workspaceId,
        organizationId: orgId,
        folderId: IsNull(),
        deletedAt: IsNull()
      },
      order: { name: 'ASC' }
    });

    // Build tree structure
    const folderMap = new Map();
    const rootFolders = [];
    
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });
    
    folders.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (folder.parentFolderId) {
        const parent = folderMap.get(folder.parentFolderId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootFolders.push(node);
      }
    });
    
    // Add unfoldered projects to the root level
    if (unfolderedProjects.length > 0) {
      rootFolders.push({
        id: 'unfoldered',
        name: 'Unfoldered Projects',
        projects: unfolderedProjects,
        children: [],
        isUnfoldered: true
      });
    }
    
    return rootFolders;
  }

  async getDashboard(folderId: string, orgId: string) {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, organizationId: orgId, deletedAt: IsNull() },
      relations: ['projects', 'children']
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Get all projects in folder and subfolders
    const allProjects = await this.getAllProjectsInFolder(folderId, orgId);

    // Calculate KPIs
    const totalProjects = allProjects.length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    const activeProjects = allProjects.filter(p => p.status === 'active').length;
    const averageProgress = 0; // TODO: Add progress field to Project entity

    // Budget calculations
    const totalBudget = allProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const spentBudget = allProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
    const budgetUtilization = totalBudget > 0 
      ? Math.round((spentBudget / totalBudget) * 100)
      : 0;

    // At-risk projects (behind schedule or over budget)
    const atRiskProjects = allProjects.filter(p => {
      const isOverdue = p.endDate && new Date(p.endDate) < new Date() && p.status !== 'completed';
      const isOverBudget = p.budget && p.actualCost && p.actualCost > p.budget;
      return isOverdue || isOverBudget;
    }).length;

    return {
      folder,
      kpis: {
        totalProjects,
        completedProjects,
        activeProjects,
        averageProgress,
        budgetUtilization,
        atRiskProjects,
        totalBudget,
        spentBudget,
      },
      projects: allProjects
    };
  }

  private async getAllProjectsInFolder(folderId: string, orgId: string): Promise<Project[]> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, organizationId: orgId },
      relations: ['projects', 'children']
    });

    if (!folder) return [];

    let allProjects = [...(folder.projects || [])];

    // Recursively get projects from children
    for (const child of folder.children || []) {
      const childProjects = await this.getAllProjectsInFolder(child.id, orgId);
      allProjects = allProjects.concat(childProjects);
    }

    return allProjects;
  }

  async moveProject(dto: MoveProjectDto, orgId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId, organizationId: orgId }
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // If moving to a folder, validate it exists
    if (dto.folderId) {
      const folder = await this.folderRepository.findOne({
        where: { id: dto.folderId, organizationId: orgId, deletedAt: IsNull() }
      });

      if (!folder) {
        throw new NotFoundException('Target folder not found');
      }

      // Ensure project belongs to same workspace
      if (folder.workspaceId !== project.workspaceId) {
        throw new BadRequestException('Cannot move project to folder in different workspace');
      }
    }

    project.folderId = dto.folderId || null;
    return this.projectRepository.save(project);
  }

  async bulkMoveProjects(projectIds: string[], folderId: string | null, orgId: string) {
    const results = [];
    
    for (const projectId of projectIds) {
      try {
        const result = await this.moveProject({ projectId, folderId }, orgId);
        results.push({ projectId, success: true, project: result });
      } catch (error) {
        results.push({ projectId, success: false, error: error.message });
      }
    }

    return results;
  }

  async update(id: string, dto: UpdateFolderDto, orgId: string) {
    const folder = await this.folderRepository.findOne({
      where: { id, organizationId: orgId, deletedAt: IsNull() }
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // If changing parent, validate depth
    if (dto.parentFolderId && dto.parentFolderId !== folder.parentFolderId) {
      const newParent = await this.folderRepository.findOne({
        where: { id: dto.parentFolderId, organizationId: orgId }
      });

      if (!newParent) {
        throw new NotFoundException('New parent folder not found');
      }

      if (newParent.hierarchyDepth >= 3) {
        throw new BadRequestException('Maximum folder depth reached');
      }

      folder.hierarchyDepth = newParent.hierarchyDepth + 1;
      folder.parentFolderId = dto.parentFolderId;
    }

    Object.assign(folder, dto);
    return this.folderRepository.save(folder);
  }

  async delete(id: string, userId: string, orgId: string) {
    const folder = await this.folderRepository.findOne({
      where: { id, organizationId: orgId, deletedAt: IsNull() },
      relations: ['projects', 'children']
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Soft delete folder
    folder.deletedAt = new Date();
    folder.deletedBy = userId;
    await this.folderRepository.save(folder);

    // Move projects to workspace root (remove folder assignment)
    await this.projectRepository.update(
      { folderId: id },
      { folderId: null }
    );

    // Recursively delete children
    for (const child of folder.children) {
      await this.delete(child.id, userId, orgId);
    }

    return { success: true, message: 'Folder deleted and projects moved to workspace root' };
  }
}
