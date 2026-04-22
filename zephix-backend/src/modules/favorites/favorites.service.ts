import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Favorite, FavoriteItemType } from './entities/favorite.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { Dashboard } from '../dashboards/entities/dashboard.entity';

export interface EnrichedFavorite {
  id: string;
  userId: string;
  organizationId: string;
  itemType: FavoriteItemType;
  itemId: string;
  displayName: string;
  displayOrder: number;
  createdAt: Date;
}

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepo: Repository<Favorite>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Dashboard)
    private readonly dashboardRepo: Repository<Dashboard>,
  ) {}

  async listFavorites(userId: string, organizationId: string): Promise<EnrichedFavorite[]> {
    const favorites = await this.favoritesRepo.find({
      where: { userId, organizationId },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });

    if (favorites.length === 0) return [];

    // Group item IDs by type for batch resolution
    const workspaceIds = favorites.filter(f => f.itemType === 'workspace').map(f => f.itemId);
    const projectIds = favorites.filter(f => f.itemType === 'project').map(f => f.itemId);
    const dashboardIds = favorites.filter(f => f.itemType === 'dashboard').map(f => f.itemId);

    // Batch-resolve names
    const nameMap = new Map<string, string>();

    if (workspaceIds.length > 0) {
      const workspaces = await this.workspaceRepo.find({
        where: { id: In(workspaceIds), deletedAt: IsNull() },
        select: ['id', 'name'],
      });
      workspaces.forEach(w => nameMap.set(w.id, w.name));
    }

    if (projectIds.length > 0) {
      const projects = await this.projectRepo.find({
        where: { id: In(projectIds), deletedAt: IsNull() },
        select: ['id', 'name'],
      });
      projects.forEach(p => nameMap.set(p.id, p.name));
    }

    if (dashboardIds.length > 0) {
      const dashboards = await this.dashboardRepo.find({
        where: { id: In(dashboardIds), deletedAt: IsNull() },
        select: ['id', 'name'],
      });
      dashboards.forEach(d => nameMap.set(d.id, d.name));
    }

    return favorites.map(f => ({
      id: f.id,
      userId: f.userId,
      organizationId: f.organizationId,
      itemType: f.itemType,
      itemId: f.itemId,
      displayName: nameMap.get(f.itemId) ?? 'Unknown item',
      displayOrder: f.displayOrder,
      createdAt: f.createdAt,
    }));
  }

  async addFavorite(
    userId: string,
    organizationId: string,
    itemType: FavoriteItemType,
    itemId: string,
  ): Promise<Favorite> {
    const existing = await this.favoritesRepo.findOne({
      where: { userId, itemType, itemId },
    });
    if (existing) return existing;

    const maxOrder = await this.favoritesRepo
      .createQueryBuilder('f')
      .select('COALESCE(MAX(f.display_order), 0)', 'max')
      .where('f.user_id = :userId', { userId })
      .getRawOne();

    const favorite = this.favoritesRepo.create({
      userId,
      organizationId,
      itemType,
      itemId,
      displayOrder: (maxOrder?.max ?? 0) + 1,
    });

    return this.favoritesRepo.save(favorite);
  }

  async removeFavorite(
    userId: string,
    itemType: FavoriteItemType,
    itemId: string,
  ): Promise<void> {
    await this.favoritesRepo.delete({ userId, itemType, itemId });
  }

  async isFavorited(
    userId: string,
    itemType: FavoriteItemType,
    itemId: string,
  ): Promise<boolean> {
    const count = await this.favoritesRepo.count({
      where: { userId, itemType, itemId },
    });
    return count > 0;
  }
}
