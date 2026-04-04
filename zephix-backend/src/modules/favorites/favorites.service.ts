import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, FavoriteItemType } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepo: Repository<Favorite>,
  ) {}

  async listFavorites(userId: string, organizationId: string): Promise<Favorite[]> {
    return this.favoritesRepo.find({
      where: { userId, organizationId },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async addFavorite(
    userId: string,
    organizationId: string,
    itemType: FavoriteItemType,
    itemId: string,
  ): Promise<Favorite> {
    // Upsert: if already favorited, return existing
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
