import { Injectable, Inject } from '@nestjs/common';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { HeatMapQueryDto } from '../dto/heat-map-query.dto';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { Project } from '../../projects/entities/project.entity';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { In } from 'typeorm';

@Injectable()
export class ResourceHeatMapService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(ResourceAllocation))
    private resourceAllocationRepository: TenantAwareRepository<ResourceAllocation>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepository: TenantAwareRepository<Project>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async getHeatMapData(
    query: HeatMapQueryDto,
    userId?: string,
    userRole?: string,
  ) {
    const { startDate, endDate, projectId } = query;

    // Get organizationId from tenant context (not from query - rule 1)
    const organizationId = this.tenantContextService.assertOrganizationId();

    // Default to next 3 months if no date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Get accessible workspace IDs (respects feature flag)
    // Returns null when user can access ALL workspaces (admin or flag off)
    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        organizationId,
        userId,
        userRole,
      );

    // If workspace membership is enforced and user has no accessible workspaces
    if (Array.isArray(accessibleWorkspaceIds) && accessibleWorkspaceIds.length === 0) {
      return this.processAllocations([], start, end);
    }

    // Build query using TenantAwareRepository query builder (automatically scoped by org)
    const queryBuilder = this.resourceAllocationRepository
      .qb('allocation')
      .where('allocation.startDate <= :end', { end })
      .andWhere('allocation.endDate >= :start', { start });

    if (projectId) {
      queryBuilder.andWhere('allocation.projectId = :projId', {
        projId: projectId,
      });
    }

    // Filter by accessible workspaces if membership is enforced (null = all workspaces)
    if (Array.isArray(accessibleWorkspaceIds) && accessibleWorkspaceIds.length > 0) {
      // Get project IDs in accessible workspaces (automatically scoped by org via TenantAwareRepository)
      const accessibleProjects = await this.projectRepository.find({
        where: {
          workspaceId: In(accessibleWorkspaceIds),
        } as any,
        select: ['id'],
      });

      const accessibleProjectIds = accessibleProjects.map((p) => p.id);

      if (accessibleProjectIds.length === 0) {
        // No projects in accessible workspaces
        return this.processAllocations([], start, end);
      }

      queryBuilder.andWhere('allocation.projectId IN (:...projectIds)', {
        projectIds: accessibleProjectIds,
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

    // Group by resource and week — skip allocations with missing data
    allocations.forEach((allocation) => {
      const resourceId = allocation.resourceId || allocation.userId;
      if (!resourceId) return; // skip allocations without a resource identifier

      if (!heatMapData[resourceId]) {
        heatMapData[resourceId] = {
          resourceId,
          weeks: {},
        };
      }

      // Skip allocations without valid date ranges
      if (!allocation.startDate || !allocation.endDate) return;

      // Calculate weekly allocations
      const allocStart = new Date(allocation.startDate);
      const allocEnd = new Date(allocation.endDate);
      if (isNaN(allocStart.getTime()) || isNaN(allocEnd.getTime())) return;

      const weeks = this.getWeeksBetween(
        new Date(Math.max(allocStart.getTime(), startDate.getTime())),
        new Date(Math.min(allocEnd.getTime(), endDate.getTime())),
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
