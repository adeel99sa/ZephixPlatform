import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { HeatMapQueryDto } from '../dto/heat-map-query.dto';

@Injectable()
export class ResourceHeatMapService {
  constructor(
    @InjectRepository(ResourceAllocation)
    private resourceAllocationRepository: Repository<ResourceAllocation>,
  ) {}

  async getHeatMapData(query: HeatMapQueryDto) {
    const { startDate, endDate, organizationId, projectId } = query;

    // Default to next 3 months if no date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Build query
    const queryBuilder = this.resourceAllocationRepository
      .createQueryBuilder('allocation')
      .where('allocation.startDate <= :end', { end })
      .andWhere('allocation.endDate >= :start', { start });

    if (organizationId) {
      queryBuilder.andWhere('allocation.organization_id = :orgId', {
        orgId: organizationId,
      });
    }

    if (projectId) {
      queryBuilder.andWhere('allocation.projectId = :projId', {
        projId: projectId,
      });
    }

    const allocations = await queryBuilder.getMany();

    // Process into heat map format
    return this.processAllocations(allocations, start, end);
  }

  private processAllocations(
    allocations: ResourceAllocation[],
    startDate: Date,
    endDate: Date,
  ) {
    const heatMapData: any = {};

    // Group by resource and week
    allocations.forEach((allocation) => {
      const resourceId = allocation.resourceId || allocation.userId;

      if (!heatMapData[resourceId]) {
        heatMapData[resourceId] = {
          resourceId,
          weeks: {},
        };
      }

      // Calculate weekly allocations
      const weeks = this.getWeeksBetween(
        new Date(
          Math.max(
            new Date(allocation.startDate).getTime(),
            startDate.getTime(),
          ),
        ),
        new Date(
          Math.min(new Date(allocation.endDate).getTime(), endDate.getTime()),
        ),
      );

      weeks.forEach((weekStart) => {
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!heatMapData[resourceId].weeks[weekKey]) {
          heatMapData[resourceId].weeks[weekKey] = {
            totalAllocation: 0,
            projects: [],
          };
        }

        heatMapData[resourceId].weeks[weekKey].totalAllocation =
          Number(heatMapData[resourceId].weeks[weekKey].totalAllocation) +
          Number(allocation.allocationPercentage);
        heatMapData[resourceId].weeks[weekKey].projects.push({
          projectId: allocation.projectId,
          allocation: allocation.allocationPercentage,
        });
      });
    });

    // Convert to array and add status indicators
    return Object.values(heatMapData).map((resource: any) => ({
      ...resource,
      weeks: Object.entries(resource.weeks).map(
        ([weekStart, weekData]: [string, any]) => ({
          weekStart,
          ...weekData,
          status: this.getAllocationStatus(weekData.totalAllocation),
        }),
      ),
    }));
  }

  private getWeeksBetween(startDate: Date, endDate: Date): Date[] {
    const weeks: Date[] = [];
    const current = new Date(startDate);

    // Adjust to start of week (Monday)
    current.setDate(current.getDate() - current.getDay() + 1);

    while (current <= endDate) {
      weeks.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  private getAllocationStatus(percentage: number): string {
    if (percentage <= 80) return 'available';
    if (percentage <= 100) return 'optimal';
    if (percentage <= 120) return 'warning';
    return 'critical';
  }
}
