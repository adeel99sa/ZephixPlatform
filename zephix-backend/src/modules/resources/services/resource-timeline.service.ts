import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceDailyLoad } from '../entities/resource-daily-load.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { AllocationType } from '../enums/allocation-type.enum';
import { getResourceSettings } from '../../../organizations/utils/resource-settings.util';
import { LoadClassification } from '../entities/resource-daily-load.entity';

/**
 * Resource Timeline Service
 * Maintains ResourceDailyLoad read model for fast timeline and heatmap queries
 */
@Injectable()
export class ResourceTimelineService {
  private readonly logger = new Logger(ResourceTimelineService.name);

  constructor(
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceDailyLoad)
    private dailyLoadRepository: Repository<ResourceDailyLoad>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Update timeline for a resource over a date range
   * Called after allocation create/update/delete
   */
  async updateTimeline(
    organizationId: string,
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    try {
      // Load organization for settings
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        this.logger.warn(
          `Organization ${organizationId} not found, skipping timeline update`,
        );
        return;
      }

      const settings = getResourceSettings(organization);

      // Get all allocations for this resource in the date range (excluding GHOST)
      const allocations = await this.allocationRepository
        .createQueryBuilder('allocation')
        .where('allocation.resourceId = :resourceId', { resourceId })
        .andWhere('allocation.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('allocation.type != :ghostType', {
          ghostType: AllocationType.GHOST,
        })
        .andWhere(
          'allocation.startDate <= :endDate AND allocation.endDate >= :startDate',
          { startDate, endDate },
        )
        .getMany();

      // Process each day in the range
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dateKey = new Date(currentDate);
        dateKey.setHours(0, 0, 0, 0);

        // Calculate loads for this day
        let hardLoad = 0;
        let softLoad = 0;

        for (const allocation of allocations) {
          const allocStart = new Date(allocation.startDate);
          allocStart.setHours(0, 0, 0, 0);
          const allocEnd = new Date(allocation.endDate);
          allocEnd.setHours(0, 0, 0, 0);

          // Check if this day falls within the allocation range
          if (dateKey >= allocStart && dateKey <= allocEnd) {
            if (allocation.type === AllocationType.HARD) {
              hardLoad += allocation.allocationPercentage || 0;
            } else if (allocation.type === AllocationType.SOFT) {
              softLoad += allocation.allocationPercentage || 0;
            }
          }
        }

        // Derive classification using same rules as detectConflicts
        let classification: LoadClassification = 'NONE';
        if (hardLoad > settings.criticalThreshold) {
          classification = 'CRITICAL';
        } else if (hardLoad + softLoad > settings.warningThreshold) {
          classification = 'WARNING';
        }

        // Upsert the daily load record
        const existing = await this.dailyLoadRepository.findOne({
          where: {
            organizationId,
            resourceId,
            date: dateKey,
          },
        });

        if (existing) {
          existing.capacityPercent = 100;
          existing.hardLoadPercent = hardLoad;
          existing.softLoadPercent = softLoad;
          existing.warningThreshold = settings.warningThreshold;
          existing.criticalThreshold = settings.criticalThreshold;
          existing.hardCap = settings.hardCap;
          existing.classification = classification;
          await this.dailyLoadRepository.save(existing);
        } else {
          await this.dailyLoadRepository.save({
            organizationId,
            resourceId,
            date: dateKey,
            capacityPercent: 100, // Default capacity, can be overridden from UserDailyCapacity
            hardLoadPercent: hardLoad,
            softLoadPercent: softLoad,
            warningThreshold: settings.warningThreshold,
            criticalThreshold: settings.criticalThreshold,
            hardCap: settings.hardCap,
            classification,
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      this.logger.debug(
        `Updated timeline for resource ${resourceId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update timeline for resource ${resourceId}:`,
        error,
      );
      // Don't throw - timeline updates should not block allocation operations
    }
  }

  /**
   * Get timeline for a resource
   */
  async getTimeline(
    resourceId: string,
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<ResourceDailyLoad[]> {
    return this.dailyLoadRepository.find({
      where: {
        resourceId,
        organizationId,
        date: Between(fromDate, toDate),
      },
      order: { date: 'ASC' },
    });
  }

  /**
   * Get heatmap data for a workspace
   */
  async getHeatmap(
    organizationId: string,
    workspaceId: string | undefined,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    // Build query - get all daily loads for the organization and date range
    const queryBuilder = this.dailyLoadRepository
      .createQueryBuilder('load')
      .leftJoin('load.resource', 'resource')
      .where('load.organizationId = :organizationId', { organizationId })
      .andWhere('load.date >= :fromDate', { fromDate })
      .andWhere('load.date <= :toDate', { toDate });

    // If workspaceId provided, filter by resources that have allocations in projects in that workspace
    if (workspaceId) {
      queryBuilder
        .leftJoin(
          'resource.allocations',
          'allocation',
          'allocation.resourceId = resource.id AND allocation.organizationId = :organizationId',
          { organizationId },
        )
        .leftJoin('allocation.project', 'project')
        .andWhere(
          '(project.workspaceId = :workspaceId OR project.workspaceId IS NULL)',
          {
            workspaceId,
          },
        )
        .distinct(true);
    }

    const results = await queryBuilder
      .select([
        'load.date',
        'load.resourceId',
        'resource.name',
        'load.hardLoadPercent',
        'load.softLoadPercent',
        'load.classification',
      ])
      .orderBy('load.date', 'ASC')
      .addOrderBy('resource.name', 'ASC')
      .getRawMany();

    // Transform to matrix structure
    const matrix: Record<string, any> = {};

    for (const row of results) {
      const dateKey = new Date(row.load_date).toISOString().split('T')[0];
      if (!matrix[dateKey]) {
        matrix[dateKey] = [];
      }

      matrix[dateKey].push({
        resourceId: row.load_resourceId,
        resourceName: row.resource_name || 'Unknown',
        hardLoad: parseFloat(row.load_hardLoadPercent) || 0,
        softLoad: parseFloat(row.load_softLoadPercent) || 0,
        classification: row.load_classification || 'NONE',
      });
    }

    // Convert to array format
    return Object.entries(matrix).map(([date, resources]) => ({
      date,
      resources,
    }));
  }
}
