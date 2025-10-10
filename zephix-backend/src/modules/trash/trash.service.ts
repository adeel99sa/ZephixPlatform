import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Team } from '../teams/entities/team.entity';
import { Risk } from '../risks/entities/risk.entity';
import { Resource } from '../resources/entities/resource.entity';
import { User } from '../users/entities/user.entity';

interface TrashItem {
  id: string;
  itemType: 'project' | 'task' | 'workspace' | 'team' | 'risk' | 'resource';
  itemName: string;
  deletedAt: Date;
  deletedBy: string;
  deletedByUser?: {
    name: string;
    email: string;
  };
  organizationId: string;
}

@Injectable()
export class TrashService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getTrashItems(organizationId: string, skip: number = 0, limit: number = 50): Promise<{
    items: TrashItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const items: TrashItem[] = [];
    let totalCount = 0;

    // Get deleted projects
    const [projects, projectCount] = await this.projectRepository.findAndCount({
      where: { organizationId, deletedAt: Not(IsNull()) },
      relations: ['deletedByUser'],
      order: { deletedAt: 'DESC' },
      withDeleted: true
    });

    items.push(...projects.map(p => ({
      id: p.id,
      itemType: 'project' as const,
      itemName: p.name,
      deletedAt: p.deletedAt,
      deletedBy: p.deletedBy,
      deletedByUser: p.deletedByUser ? {
        name: `${p.deletedByUser.firstName} ${p.deletedByUser.lastName}`,
        email: p.deletedByUser.email
      } : undefined,
      organizationId: p.organizationId
    })));
    totalCount += projectCount;

    // Get deleted tasks
    const [tasks, taskCount] = await this.taskRepository.findAndCount({
      where: { organizationId, deletedAt: Not(IsNull()) },
      relations: ['deletedByUser'],
      order: { deletedAt: 'DESC' },
      withDeleted: true
    });

    items.push(...tasks.map(t => ({
      id: t.id,
      itemType: 'task' as const,
      itemName: t.title,
      deletedAt: t.deletedAt,
      deletedBy: t.deletedBy,
      deletedByUser: t.deletedByUser ? {
        name: `${t.deletedByUser.firstName} ${t.deletedByUser.lastName}`,
        email: t.deletedByUser.email
      } : undefined,
      organizationId: t.organizationId
    })));
    totalCount += taskCount;

    // Get deleted workspaces
    const [workspaces, workspaceCount] = await this.workspaceRepository.findAndCount({
      where: { organizationId, deletedAt: Not(IsNull()) },
      relations: ['deletedByUser'],
      order: { deletedAt: 'DESC' },
      withDeleted: true
    });

    items.push(...workspaces.map(w => ({
      id: w.id,
      itemType: 'workspace' as const,
      itemName: w.name,
      deletedAt: w.deletedAt,
      deletedBy: w.deletedBy,
      deletedByUser: w.deletedByUser ? {
        name: `${w.deletedByUser.firstName} ${w.deletedByUser.lastName}`,
        email: w.deletedByUser.email
      } : undefined,
      organizationId: w.organizationId
    })));
    totalCount += workspaceCount;

    // Get deleted teams
    const [teams, teamCount] = await this.teamRepository.findAndCount({
      where: { organizationId, deletedAt: Not(IsNull()) },
      relations: ['deletedByUser'],
      order: { deletedAt: 'DESC' },
      withDeleted: true
    });

    items.push(...teams.map(t => ({
      id: t.id,
      itemType: 'team' as const,
      itemName: t.name,
      deletedAt: t.deletedAt,
      deletedBy: t.deletedBy,
      deletedByUser: t.deletedByUser ? {
        name: `${t.deletedByUser.firstName} ${t.deletedByUser.lastName}`,
        email: t.deletedByUser.email
      } : undefined,
      organizationId: t.organizationId
    })));
    totalCount += teamCount;

    // Get deleted risks
    const [risks, riskCount] = await this.riskRepository.findAndCount({
      where: { organizationId, deletedAt: Not(IsNull()) },
      relations: ['deletedByUser'],
      order: { deletedAt: 'DESC' },
      withDeleted: true
    });

    items.push(...risks.map(r => ({
      id: r.id,
      itemType: 'risk' as const,
      itemName: r.description,
      deletedAt: r.deletedAt,
      deletedBy: r.deletedBy,
      deletedByUser: r.deletedByUser ? {
        name: `${r.deletedByUser.firstName} ${r.deletedByUser.lastName}`,
        email: r.deletedByUser.email
      } : undefined,
      organizationId: r.organizationId
    })));
    totalCount += riskCount;

    // Get deleted resources
    const [resources, resourceCount] = await this.resourceRepository.findAndCount({
      where: { organizationId, deletedAt: Not(IsNull()) },
      relations: ['deletedByUser'],
      order: { deletedAt: 'DESC' },
      withDeleted: true
    });

    items.push(...resources.map(r => ({
      id: r.id,
      itemType: 'resource' as const,
      itemName: r.name,
      deletedAt: r.deletedAt,
      deletedBy: r.deletedBy,
      deletedByUser: r.deletedByUser ? {
        name: `${r.deletedByUser.firstName} ${r.deletedByUser.lastName}`,
        email: r.deletedByUser.email
      } : undefined,
      organizationId: r.organizationId
    })));
    totalCount += resourceCount;

    // Sort all items by deletion date and apply pagination
    const sortedItems = items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    const paginatedItems = sortedItems.slice(skip, skip + limit);
    const page = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items: paginatedItems,
      total: totalCount,
      page,
      totalPages
    };
  }

  async restoreItem(itemType: string, id: string, organizationId: string): Promise<void> {
    const repositoryMap = {
      project: this.projectRepository,
      task: this.taskRepository,
      workspace: this.workspaceRepository,
      team: this.teamRepository,
      risk: this.riskRepository,
      resource: this.resourceRepository,
    };

    const repository = repositoryMap[itemType as keyof typeof repositoryMap];
    if (!repository) {
      throw new BadRequestException('Invalid item type');
    }

    // Verify belongs to organization and is soft-deleted
    const item = await repository.findOne({
      where: { id, organizationId, deletedAt: Not(IsNull()) } as any,
      withDeleted: true
    });

    if (!item) {
      throw new NotFoundException('Item not found in trash');
    }

    await (repository as any).update(id, {
      deletedAt: null,
      deletedBy: null
    });
  }

  async permanentDelete(itemType: string, id: string, organizationId: string): Promise<void> {
    const repositoryMap = {
      project: this.projectRepository,
      task: this.taskRepository,
      workspace: this.workspaceRepository,
      team: this.teamRepository,
      risk: this.riskRepository,
      resource: this.resourceRepository,
    };

    const repository = repositoryMap[itemType as keyof typeof repositoryMap];
    if (!repository) {
      throw new BadRequestException('Invalid item type');
    }

    // Verify belongs to organization and is soft-deleted
    const item = await repository.findOne({
      where: { id, organizationId, deletedAt: Not(IsNull()) } as any
    });

    if (!item) {
      throw new NotFoundException('Item not found in trash');
    }

    await (repository as any).delete(id);
  }

  async emptyTrash(organizationId: string): Promise<number> {
    let count = 0;

    // Permanently delete all soft-deleted items
    const result1 = await this.projectRepository.delete({
      organizationId,
      deletedAt: Not(IsNull())
    } as any);
    count += result1.affected || 0;

    const result2 = await this.taskRepository.delete({
      organizationId,
      deletedAt: Not(IsNull())
    } as any);
    count += result2.affected || 0;

    const result3 = await this.workspaceRepository.delete({
      organizationId,
      deletedAt: Not(IsNull())
    } as any);
    count += result3.affected || 0;

    const result4 = await this.teamRepository.delete({
      organizationId,
      deletedAt: Not(IsNull())
    } as any);
    count += result4.affected || 0;

    const result5 = await this.riskRepository.delete({
      organizationId,
      deletedAt: Not(IsNull())
    } as any);
    count += result5.affected || 0;

    const result6 = await this.resourceRepository.delete({
      organizationId,
      deletedAt: Not(IsNull())
    } as any);
    count += result6.affected || 0;

    return count;
  }

  async getTrashStats(organizationId: string): Promise<{
    totalItems: number;
    byType: Record<string, number>;
    oldestItem?: Date;
    newestItem?: Date;
  }> {
    const { items } = await this.getTrashItems(organizationId, 0, 1000); // Get all items for stats
    
    const byType: Record<string, number> = {};
    let oldestItem: Date | undefined;
    let newestItem: Date | undefined;

    items.forEach(item => {
      byType[item.itemType] = (byType[item.itemType] || 0) + 1;
      
      if (!oldestItem || item.deletedAt < oldestItem) {
        oldestItem = item.deletedAt;
      }
      
      if (!newestItem || item.deletedAt > newestItem) {
        newestItem = item.deletedAt;
      }
    });

    return {
      totalItems: items.length,
      byType,
      oldestItem,
      newestItem
    };
  }
}
