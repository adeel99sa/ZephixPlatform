import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { KPICache } from './entities/kpi-cache.entity';

@Injectable()
export class KPICacheService {
  private readonly logger = new Logger(KPICacheService.name);

  constructor(
    @InjectRepository(KPICache)
    private kpiCacheRepository: Repository<KPICache>,
  ) {}

  /**
   * Get cached KPI data
   */
  async getCachedKPIs(
    entityType: 'task' | 'project' | 'workspace' | 'program' | 'organization',
    entityId: string,
  ): Promise<any | null> {
    try {
      const cache = await this.kpiCacheRepository.findOne({
        where: {
          entityType,
          entityId,
          expiresAt: LessThan(new Date(Date.now() + 24 * 60 * 60 * 1000)), // Not expired
        },
      });

      if (cache) {
        this.logger.debug(`Cache hit for ${entityType}:${entityId}`);
        return cache.kpiData;
      }

      this.logger.debug(`Cache miss for ${entityType}:${entityId}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cached KPIs:`, error);
      return null;
    }
  }

  /**
   * Cache KPI data
   */
  async setCachedKPIs(
    entityType: 'task' | 'project' | 'workspace' | 'program' | 'organization',
    entityId: string,
    kpiData: any,
    hierarchyPath?: string,
    ttlHours: number = 1,
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      await this.kpiCacheRepository.upsert(
        {
          entityType,
          entityId,
          kpiData,
          hierarchyPath,
          expiresAt,
        },
        ['entityType', 'entityId'],
      );

      this.logger.debug(`Cached KPIs for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(`Error caching KPIs:`, error);
    }
  }

  /**
   * Invalidate cache for an entity
   */
  async invalidateCache(
    entityType: 'task' | 'project' | 'workspace' | 'program' | 'organization',
    entityId: string,
  ): Promise<void> {
    try {
      await this.kpiCacheRepository.delete({
        entityType,
        entityId,
      });

      this.logger.debug(`Invalidated cache for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache:`, error);
    }
  }

  /**
   * Invalidate cache for all entities in a hierarchy path
   */
  async invalidateHierarchyCache(hierarchyPath: string): Promise<void> {
    try {
      await this.kpiCacheRepository.delete({
        hierarchyPath,
      });

      this.logger.debug(`Invalidated hierarchy cache for: ${hierarchyPath}`);
    } catch (error) {
      this.logger.error(`Error invalidating hierarchy cache:`, error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.kpiCacheRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      this.logger.debug(`Cleaned up ${result.affected} expired cache entries`);
      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Error cleaning up expired cache:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    byEntityType: Record<string, number>;
  }> {
    try {
      const totalEntries = await this.kpiCacheRepository.count();
      const expiredEntries = await this.kpiCacheRepository.count({
        where: {
          expiresAt: LessThan(new Date()),
        },
      });

      const byEntityType = await this.kpiCacheRepository
        .createQueryBuilder('cache')
        .select('cache.entityType', 'entityType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('cache.entityType')
        .getRawMany();

      const entityTypeMap = byEntityType.reduce((acc, item) => {
        acc[item.entityType] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalEntries,
        expiredEntries,
        byEntityType: entityTypeMap,
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats:`, error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        byEntityType: {},
      };
    }
  }
}













