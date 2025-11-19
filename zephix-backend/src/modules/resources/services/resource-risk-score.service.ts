import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Resource } from '../entities/resource.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceConflict } from '../entities/resource-conflict.entity';
import { UserDailyCapacity } from '../entities/user-daily-capacity.entity';
import { Project } from '../../projects/entities/project.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service';

interface RiskScoreInput {
  averageAllocationPercent: number;
  maxAllocationPercent: number;
  daysAbove100: number;
  daysAbove120: number;
  daysAbove150: number;
  totalDays: number;
  maxConcurrentProjects: number;
  existingConflictsCount: number;
  maxConflictSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
}

interface RiskScoreResult {
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: Array<{ code: string; message: string }>;
}

@Injectable()
export class ResourceRiskScoreService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceConflict)
    private conflictRepository: Repository<ResourceConflict>,
    @InjectRepository(UserDailyCapacity)
    private capacityRepository: Repository<UserDailyCapacity>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @Inject(forwardRef(() => WorkspaceAccessService))
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  /**
   * Pure scoring function - no database calls, no side effects
   */
  private computeRiskScore(input: RiskScoreInput): RiskScoreResult {
    let baseScore = 0;

    // Over-allocation intensity (0-40 points)
    if (input.maxAllocationPercent > 150) {
      baseScore += 40;
    } else if (input.maxAllocationPercent > 120) {
      baseScore += 30 + (input.maxAllocationPercent - 120) / 3; // 30-40 points
    } else if (input.maxAllocationPercent > 100) {
      baseScore += 20 + (input.maxAllocationPercent - 100) / 2; // 20-30 points
    } else if (input.maxAllocationPercent > 80) {
      baseScore += (input.maxAllocationPercent - 80) / 2; // 0-10 points
    }

    // Duration of over-allocation (0-30 points)
    const overAllocationRatio = input.daysAbove100 / input.totalDays;
    baseScore += Math.min(30, overAllocationRatio * 30);

    // Critical over-allocation days (0-20 points)
    baseScore += Math.min(20, input.daysAbove150 * 2); // 2 points per day over 150%
    baseScore += Math.min(10, input.daysAbove120 * 0.5); // 0.5 points per day over 120%

    // Concurrent project complexity (0-10 points)
    if (input.maxConcurrentProjects >= 5) {
      baseScore += 10;
    } else if (input.maxConcurrentProjects >= 3) {
      baseScore += 5;
    }

    // Apply existing conflict penalty
    if (input.existingConflictsCount > 0) {
      baseScore += Math.min(10, input.existingConflictsCount * 2);
      if (input.maxConflictSeverity === 'critical') {
        baseScore += 5;
      } else if (input.maxConflictSeverity === 'high') {
        baseScore += 3;
      }
    }

    // Cap and normalize
    const riskScore = Math.min(100, Math.round(baseScore));

    // Determine severity band
    let severity: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskScore < 40) {
      severity = 'LOW';
    } else if (riskScore < 70) {
      severity = 'MEDIUM';
    } else {
      severity = 'HIGH';
    }

    // Generate top factors (max 3, priority order)
    const factors: Array<{ code: string; message: string }> = [];

    if (input.maxAllocationPercent > 150) {
      factors.push({
        code: 'MAX_OVER_150',
        message: `Critical over-allocation: ${Math.round(input.maxAllocationPercent)}% on peak day`,
      });
    }

    if (input.daysAbove150 > 0 && factors.length < 3) {
      factors.push({
        code: 'DAYS_OVER_150',
        message: `${input.daysAbove150} days exceed 150% capacity`,
      });
    }

    if (input.daysAbove120 > 0 && factors.length < 3) {
      factors.push({
        code: 'DAYS_OVER_120',
        message: `${input.daysAbove120} days exceed 120% capacity`,
      });
    }

    if (input.daysAbove100 > 0 && factors.length < 3) {
      factors.push({
        code: 'DAYS_OVER_100',
        message: `${input.daysAbove100} days exceed 100% capacity`,
      });
    }

    if (input.maxConcurrentProjects >= 5 && factors.length < 3) {
      factors.push({
        code: 'HIGH_CONCURRENT_PROJECTS',
        message: `Assigned to ${input.maxConcurrentProjects} concurrent projects`,
      });
    }

    if (input.existingConflictsCount > 0 && factors.length < 3) {
      factors.push({
        code: 'EXISTING_CONFLICTS',
        message: `${input.existingConflictsCount} unresolved conflicts in range`,
      });
    }

    if (input.averageAllocationPercent > 90 && factors.length < 3) {
      factors.push({
        code: 'HIGH_AVG_ALLOCATION',
        message: `Average allocation ${Math.round(input.averageAllocationPercent)}% is near capacity`,
      });
    }

    return {
      score: riskScore,
      severity,
      factors,
    };
  }

  /**
   * Get risk score for a single resource
   */
  async getResourceRiskScore(params: {
    resourceId: string;
    organizationId: string;
    dateFrom: Date;
    dateTo: Date;
  }): Promise<{
    resourceId: string;
    resourceName: string;
    riskScore: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    topFactors: string[];
    metrics: {
      avgAllocation: number;
      maxAllocation: number;
      daysOver100: number;
      daysOver120: number;
      daysOver150: number;
      maxConcurrentProjects: number;
      existingConflictsCount: number;
    };
  }> {
    // Verify resource belongs to organization
    const resource = await this.resourceRepository.findOne({
      where: {
        id: params.resourceId,
        organizationId: params.organizationId,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Validate date range
    if (params.dateFrom > params.dateTo) {
      throw new BadRequestException('dateFrom must be before dateTo');
    }

    // Calculate days in range
    const totalDays =
      Math.ceil(
        (params.dateTo.getTime() - params.dateFrom.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    // Limit to 365 days
    if (totalDays > 365) {
      throw new BadRequestException('Date range cannot exceed 365 days');
    }

    // Get allocations for this resource that overlap with date range
    const allocations = await this.allocationRepository
      .createQueryBuilder('allocation')
      .where('allocation.resourceId = :resourceId', {
        resourceId: params.resourceId,
      })
      .andWhere('allocation.organizationId = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('allocation.startDate <= :dateTo', { dateTo: params.dateTo })
      .andWhere('allocation.endDate >= :dateFrom', { dateFrom: params.dateFrom })
      .getMany();

    // Filter allocations that overlap with date range
    const overlappingAllocations = allocations.filter((alloc) => {
      const allocStart = new Date(alloc.startDate);
      const allocEnd = new Date(alloc.endDate);
      return (
        allocStart <= params.dateTo &&
        allocEnd >= params.dateFrom &&
        alloc.allocationPercentage > 0
      );
    });

    // Get daily capacity records if they exist
    const dailyCapacities = await this.capacityRepository.find({
      where: {
        userId: resource.userId || params.resourceId,
        organizationId: params.organizationId,
        capacityDate: Between(params.dateFrom, params.dateTo),
      },
    });

    const capacityMap = new Map<string, number>();
    dailyCapacities.forEach((cap) => {
      const dateKey = cap.capacityDate.toISOString().split('T')[0];
      capacityMap.set(dateKey, cap.allocatedPercentage);
    });

    // Calculate daily allocation percentages
    const dailyAllocations: Map<string, { allocation: number; projects: Set<string> }> =
      new Map();

    // Initialize all days in range
    const currentDate = new Date(params.dateFrom);
    while (currentDate <= params.dateTo) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyAllocations.set(dateKey, {
        allocation: 0,
        projects: new Set<string>(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate allocations per day
    overlappingAllocations.forEach((alloc) => {
      const allocStart = new Date(alloc.startDate);
      const allocEnd = new Date(alloc.endDate);
      const current = new Date(Math.max(allocStart.getTime(), params.dateFrom.getTime()));
      const end = new Date(Math.min(allocEnd.getTime(), params.dateTo.getTime()));

      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        const dayData = dailyAllocations.get(dateKey);
        if (dayData) {
          dayData.allocation += alloc.allocationPercentage || 0;
          if (alloc.projectId) {
            dayData.projects.add(alloc.projectId);
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // Use daily capacity if available, otherwise use calculated allocation
    const dailyAllocationValues: number[] = [];
    let daysOver100 = 0;
    let daysOver120 = 0;
    let daysOver150 = 0;
    let maxConcurrentProjects = 0;

    dailyAllocations.forEach((dayData, dateKey) => {
      // Prefer UserDailyCapacity if exists, otherwise use calculated
      const allocation = capacityMap.has(dateKey)
        ? capacityMap.get(dateKey)!
        : dayData.allocation;

      dailyAllocationValues.push(allocation);

      if (allocation > 100) daysOver100++;
      if (allocation > 120) daysOver120++;
      if (allocation > 150) daysOver150++;

      const concurrentProjects = dayData.projects.size;
      if (concurrentProjects > maxConcurrentProjects) {
        maxConcurrentProjects = concurrentProjects;
      }
    });

    // Calculate metrics
    const avgAllocation =
      dailyAllocationValues.length > 0
        ? dailyAllocationValues.reduce((sum, val) => sum + val, 0) /
          dailyAllocationValues.length
        : 0;
    const maxAllocation =
      dailyAllocationValues.length > 0
        ? Math.max(...dailyAllocationValues)
        : 0;

    // Get existing conflicts
    const existingConflicts = await this.conflictRepository.find({
      where: {
        resourceId: params.resourceId,
        conflictDate: Between(params.dateFrom, params.dateTo),
        resolved: false,
      },
    });

    const existingConflictsCount = existingConflicts.length;
    let maxConflictSeverity: 'low' | 'medium' | 'high' | 'critical' | null = null;

    if (existingConflicts.length > 0) {
      const severities = existingConflicts.map((c) => c.severity);
      if (severities.includes('critical')) {
        maxConflictSeverity = 'critical';
      } else if (severities.includes('high')) {
        maxConflictSeverity = 'high';
      } else if (severities.includes('medium')) {
        maxConflictSeverity = 'medium';
      } else {
        maxConflictSeverity = 'low';
      }
    }

    // Compute risk score
    const scoreResult = this.computeRiskScore({
      averageAllocationPercent: avgAllocation,
      maxAllocationPercent: maxAllocation,
      daysAbove100: daysOver100,
      daysAbove120: daysOver120,
      daysAbove150: daysOver150,
      totalDays,
      maxConcurrentProjects,
      existingConflictsCount,
      maxConflictSeverity,
    });

    return {
      resourceId: params.resourceId,
      resourceName: resource.name || resource.email,
      riskScore: scoreResult.score,
      severity: scoreResult.severity,
      topFactors: scoreResult.factors.map((f) => f.message),
      metrics: {
        avgAllocation: Math.round(avgAllocation * 10) / 10,
        maxAllocation: Math.round(maxAllocation * 10) / 10,
        daysOver100,
        daysOver120,
        daysOver150,
        maxConcurrentProjects,
        existingConflictsCount,
      },
    };
  }

  /**
   * Get workspace-level risk summary
   */
  async getWorkspaceResourceRiskSummary(params: {
    workspaceId: string;
    organizationId: string;
    dateFrom: Date;
    dateTo: Date;
    limit?: number;
    minRiskScore?: number;
    userId?: string;
    userRole?: string;
  }): Promise<{
    workspaceId: string;
    workspaceName: string;
    summary: {
      totalResources: number;
      highRiskCount: number;
      mediumRiskCount: number;
      lowRiskCount: number;
      averageRiskScore: number;
    };
    highRiskResources: Array<{
      resourceId: string;
      resourceName: string;
      riskScore: number;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      topFactors: string[];
    }>;
  }> {
    // Verify workspace belongs to organization and user has access
    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        params.organizationId,
        params.userId,
        params.userRole,
      );

    if (
      accessibleWorkspaceIds !== null &&
      !accessibleWorkspaceIds.includes(params.workspaceId)
    ) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    // Get projects in workspace
    const workspaceProjects = await this.projectRepository.find({
      where: {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
      },
      select: ['id', 'name'],
    });

    if (workspaceProjects.length === 0) {
      // Return empty result if no projects
      return {
        workspaceId: params.workspaceId,
        workspaceName: 'Unknown',
        summary: {
          totalResources: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          averageRiskScore: 0,
        },
        highRiskResources: [],
      };
    }

    const projectIds = workspaceProjects.map((p) => p.id);

    // Get all resources that have allocations in these projects that overlap with date range
    const allocations = await this.allocationRepository
      .createQueryBuilder('allocation')
      .where('allocation.organizationId = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('allocation.projectId IN (:...projectIds)', { projectIds })
      .andWhere('allocation.startDate <= :dateTo', { dateTo: params.dateTo })
      .andWhere('allocation.endDate >= :dateFrom', { dateFrom: params.dateFrom })
      .getMany();

    // Get unique resource IDs
    const resourceIds = [
      ...new Set(
        allocations
          .map((a) => a.resourceId)
          .filter((id): id is string => !!id),
      ),
    ];

    if (resourceIds.length === 0) {
      return {
        workspaceId: params.workspaceId,
        workspaceName: 'Unknown',
        summary: {
          totalResources: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          averageRiskScore: 0,
        },
        highRiskResources: [],
      };
    }

    // Get workspace name
    const workspace = await this.workspaceRepository.findOne({
      where: {
        id: params.workspaceId,
        organizationId: params.organizationId,
      },
      select: ['id', 'name'],
    });

    const workspaceName = workspace?.name || 'Unknown';

    // Calculate risk scores for each resource
    const resourceScores = await Promise.all(
      resourceIds.map(async (resourceId) => {
        try {
          const score = await this.getResourceRiskScore({
            resourceId,
            organizationId: params.organizationId,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
          });
          return score;
        } catch (error) {
          // Skip resources that fail (e.g., deleted)
          return null;
        }
      }),
    );

    // Filter out nulls and apply minRiskScore filter
    const validScores = resourceScores
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .filter((s) => (params.minRiskScore ?? 0) <= s.riskScore);

    // Sort by risk score descending
    validScores.sort((a, b) => b.riskScore - a.riskScore);

    // Calculate summary stats
    const totalResources = validScores.length;
    const highRiskCount = validScores.filter((s) => s.severity === 'HIGH').length;
    const mediumRiskCount = validScores.filter((s) => s.severity === 'MEDIUM').length;
    const lowRiskCount = validScores.filter((s) => s.severity === 'LOW').length;
    const averageRiskScore =
      totalResources > 0
        ? Math.round(
            (validScores.reduce((sum, s) => sum + s.riskScore, 0) / totalResources) *
              10,
          ) / 10
        : 0;

    // Apply limit
    const limit = params.limit ?? 10;
    const highRiskResources = validScores.slice(0, limit).map((s) => ({
      resourceId: s.resourceId,
      resourceName: s.resourceName,
      riskScore: s.riskScore,
      severity: s.severity,
      topFactors: s.topFactors,
    }));

    return {
      workspaceId: params.workspaceId,
      workspaceName,
      summary: {
        totalResources,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        averageRiskScore,
      },
      highRiskResources,
    };
  }
}

