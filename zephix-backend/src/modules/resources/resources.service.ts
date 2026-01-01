import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Between, DataSource, Like, In, Not } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkspaceAccessService } from '../workspaces/services/workspace-access.service';
import { Organization } from '../../organizations/entities/organization.entity';
import { AllocationType } from './enums/allocation-type.enum';
import { getResourceSettings } from '../../organizations/utils/resource-settings.util';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Resource))
    private resourceRepository: TenantAwareRepository<Resource>,
    @Inject(getTenantAwareRepositoryToken(ResourceAllocation))
    private resourceAllocationRepository: TenantAwareRepository<ResourceAllocation>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepository: TenantAwareRepository<Project>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(ResourceConflict)
    private conflictRepository: Repository<ResourceConflict>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => WorkspaceAccessService))
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findAll(
    organizationId?: string,
    userId?: string,
    userRole?: string,
    filters?: {
      skills?: string[];
      roles?: string[];
      workspaceId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<any> {
    try {
      // organizationId now comes from tenant context
      const orgId = this.tenantContextService.assertOrganizationId();

      // Get accessible workspace IDs (respects feature flag)
      const accessibleWorkspaceIds =
        await this.workspaceAccessService.getAccessibleWorkspaceIds(
          orgId,
          userId,
          userRole,
        );

      // If workspace membership is enforced and user has no accessible workspaces
      if (
        accessibleWorkspaceIds !== null &&
        accessibleWorkspaceIds.length === 0
      ) {
        return { data: [] };
      }

      // Use tenant-aware query builder - organizationId filter is automatic
      const queryBuilder = this.resourceRepository
        .qb('resource')
        .andWhere('resource.isActive = :isActive', { isActive: true });

      // Filter by skills (JSONB array contains all requested skills)
      if (filters?.skills && filters.skills.length > 0) {
        // For each skill, ensure it's in the skills JSONB array
        filters.skills.forEach((skill, index) => {
          queryBuilder.andWhere(`resource.skills @> :skill${index}::jsonb`, {
            [`skill${index}`]: JSON.stringify([skill]),
          });
        });
      }

      // Filter by roles
      if (filters?.roles && filters.roles.length > 0) {
        queryBuilder.andWhere('resource.role IN (:...roles)', {
          roles: filters.roles,
        });
      }

      // Filter by workspaceId - resources that have allocations in that workspace
      if (filters?.workspaceId) {
        // Get projects in the workspace
        // TenantAwareRepository automatically scopes by organizationId
        const workspaceProjects = await this.projectRepository.find({
          where: {
            workspaceId: filters.workspaceId,
          },
          select: ['id'],
        });

        if (workspaceProjects.length === 0) {
          // No projects in workspace, return empty
          return { data: [] };
        }

        const projectIds = workspaceProjects.map((p) => p.id);

        // Filter resources that have allocations in these projects
        // organizationId filter is automatic in subquery via TenantAwareRepository
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM resource_allocations ra
            WHERE ra.resource_id = resource.id
            AND ra.project_id IN (:...projectIds)
          )`,
          { projectIds },
        );
      }

      // Filter by date range - resources that have allocations in the date range
      if (filters?.dateFrom && filters?.dateTo) {
        const startDate = new Date(filters.dateFrom);
        const endDate = new Date(filters.dateTo);

        // organizationId filter is automatic in subquery
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM resource_allocations ra
            WHERE ra.resource_id = resource.id
            AND ra.start_date <= :endDate
            AND ra.end_date >= :startDate
          )`,
          { startDate, endDate },
        );
      }

      // Apply workspace membership filtering if needed
      if (accessibleWorkspaceIds !== null && filters?.workspaceId) {
        // If filtering by workspace, ensure it's accessible
        if (!accessibleWorkspaceIds.includes(filters.workspaceId)) {
          return { data: [] };
        }
      }

      queryBuilder.orderBy('resource.createdAt', 'DESC');

      const resources = await queryBuilder.getMany().catch((err) => {
        console.error('❌ Resources query error:', err.message);
        return [];
      });

      console.log(
        `✅ Resources: Found ${resources.length} resources for org ${orgId}`,
      );
      return { data: resources || [] };
    } catch (error) {
      console.error('❌ Resources findAll error:', error);
      return { data: [] };
    }
  }

  async create(createResourceDto: any): Promise<Resource> {
    try {
      const resource = new Resource();
      Object.assign(resource, createResourceDto);
      return await this.resourceRepository.save(resource);
    } catch (error) {
      console.error('❌ Create resource error:', error);
      throw new BadRequestException('Failed to create resource');
    }
  }

  async findOne(id: string, organizationId: string): Promise<Resource | null> {
    try {
      // TenantAwareRepository automatically scopes by organizationId
      return await this.resourceRepository.findOne({
        where: { id },
        relations: ['allocations'],
      });
    } catch (error) {
      console.error('❌ Find resource error:', error);
      return null;
    }
  }

  async update(
    id: string,
    updateResourceDto: any,
    organizationId: string,
  ): Promise<Resource> {
    try {
      const resource = await this.findOne(id, organizationId);
      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      Object.assign(resource, updateResourceDto);
      return await this.resourceRepository.save(resource);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('❌ Update resource error:', error);
      throw new BadRequestException('Failed to update resource');
    }
  }

  async getResourceAllocation(
    resourceId: string,
    startDate: string,
    endDate: string,
    organizationId: string,
  ): Promise<any> {
    try {
      const allocations = await this.resourceAllocationRepository.find({
        where: {
          resourceId,
          organizationId,
          startDate: Between(new Date(startDate), new Date(endDate)),
        },
      });

      const totalAllocation = allocations.reduce(
        (sum, allocation) => sum + (allocation.allocationPercentage || 0),
        0,
      );

      return {
        resourceId,
        allocationPercentage: totalAllocation,
        allocations: allocations,
        isOverallocated: totalAllocation > 100,
        isCritical: totalAllocation > 120,
      };
    } catch (error) {
      console.error('❌ Get resource allocation error:', error);
      return {
        resourceId,
        allocationPercentage: 0,
        allocations: [],
        isOverallocated: false,
        isCritical: false,
      };
    }
  }

  async getConflicts(
    organizationId: string,
    userId?: string,
    userRole?: string,
  ) {
    try {
      // Get accessible workspace IDs (respects feature flag)
      const accessibleWorkspaceIds =
        await this.workspaceAccessService.getAccessibleWorkspaceIds(
          organizationId,
          userId,
          userRole,
        );

      // If workspace membership is enforced and user has no accessible workspaces
      if (
        accessibleWorkspaceIds !== null &&
        accessibleWorkspaceIds.length === 0
      ) {
        return { data: [] };
      }

      // Get all resources with their allocations
      // Use tenant-aware query builder - organizationId filter is automatic
      const queryBuilder = this.resourceRepository
        .qb('resource')
        .leftJoinAndSelect('resource.allocations', 'allocation')
        .andWhere('resource.isActive = :isActive', { isActive: true });

      // If workspace membership is enforced, filter allocations by accessible workspaces
      if (accessibleWorkspaceIds !== null) {
        // Get project IDs in accessible workspaces
        // TenantAwareRepository automatically scopes by organizationId
        const accessibleProjects = await this.projectRepository.find({
          where: {
            workspaceId: In(accessibleWorkspaceIds),
          },
          select: ['id'],
        });

        const accessibleProjectIds = accessibleProjects.map((p) => p.id);

        if (accessibleProjectIds.length === 0) {
          // No projects in accessible workspaces
          return { data: [] };
        }

        // Filter allocations to only those in accessible projects
        queryBuilder.andWhere(
          '(allocation.projectId IS NULL OR allocation.projectId IN (:...projectIds))',
          { projectIds: accessibleProjectIds },
        );
      }

      const resources = await queryBuilder.getMany();

      const conflicts = [];

      for (const resource of resources) {
        // Allocations are already filtered by the query builder if workspace membership is enforced
        const relevantAllocations = resource.allocations || [];

        const totalAllocation = relevantAllocations.reduce(
          (sum, a) => sum + (a.allocationPercentage || 0),
          0,
        );

        if (totalAllocation > 100) {
          conflicts.push({
            id: `conflict-${resource.id}`,
            resourceId: resource.id,
            resourceName: resource.name,
            totalAllocation,
            severity:
              totalAllocation > 150
                ? 'critical'
                : totalAllocation > 120
                  ? 'high'
                  : 'medium',
            description: `Resource ${resource.name} is overallocated by ${totalAllocation - 100}%`,
            affectedProjects: relevantAllocations.map((a) => ({
              projectId: a.projectId,
              allocation: a.allocationPercentage,
            })),
          });
        }
      }

      return { data: conflicts };
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      throw new BadRequestException('Failed to fetch conflicts');
    }
  }

  async detectConflicts(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
    organizationId?: string,
  ) {
    try {
      // Find existing allocations that overlap with the date range
      // Exclude GHOST allocations from conflict calculations
      // Date overlap: (allocation.startDate <= newEndDate AND allocation.endDate >= newStartDate)
      const existingAllocations = await this.resourceAllocationRepository
        .createQueryBuilder('allocation')
        .where('allocation.resourceId = :resourceId', { resourceId })
        .andWhere('allocation.type != :ghostType', {
          ghostType: AllocationType.GHOST,
        })
        .andWhere(
          'allocation.startDate <= :endDate AND allocation.endDate >= :startDate',
          { startDate, endDate },
        )
        .getMany();

      // Compute totalHardLoad: sum of HARD allocations
      const totalHardLoad = existingAllocations
        .filter((a) => a.type === AllocationType.HARD)
        .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);

      // Compute totalSoftLoad: sum of SOFT allocations
      const totalSoftLoad = existingAllocations
        .filter((a) => a.type === AllocationType.SOFT)
        .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);

      // Load organization settings if organizationId is provided
      let settings = null;
      let classification: 'NONE' | 'WARNING' | 'CRITICAL' = 'NONE';

      if (organizationId) {
        const organization = await this.organizationRepository.findOne({
          where: { id: organizationId },
        });

        if (organization) {
          settings = getResourceSettings(organization);

          // Critical risk: only when totalHardLoad exceeds criticalThreshold
          if (totalHardLoad > settings.criticalThreshold) {
            classification = 'CRITICAL';
          }
          // Warning risk: when totalHardLoad + totalSoftLoad exceeds warningThreshold
          else if (totalHardLoad + totalSoftLoad > settings.warningThreshold) {
            classification = 'WARNING';
          }
        }
      }

      // Legacy compatibility: hasConflicts if total exceeds 100
      const totalAllocation = totalHardLoad + totalSoftLoad;
      const hasConflict = totalAllocation + allocationPercentage > 100;

      return {
        hasConflicts: hasConflict || classification !== 'NONE',
        conflicts: hasConflict ? existingAllocations : [],
        totalAllocation: totalAllocation + allocationPercentage,
        availableCapacity: 100 - totalAllocation,
        // Extended fields for Resource Intelligence
        hardLoad: totalHardLoad,
        softLoad: totalSoftLoad,
        classification,
      };
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw new BadRequestException('Failed to detect conflicts');
    }
  }

  async createAllocation(allocationData: any) {
    try {
      // First detect conflicts
      const conflictCheck = await this.detectConflicts(
        allocationData.resourceId,
        new Date(allocationData.startDate),
        new Date(allocationData.endDate),
        allocationData.allocationPercentage,
      );

      if (conflictCheck.hasConflicts) {
        throw new BadRequestException(
          'Resource allocation would create conflicts',
        );
      }

      // Create the allocation
      const allocation = this.resourceAllocationRepository.create({
        resourceId: allocationData.resourceId,
        projectId: allocationData.projectId,
        userId: allocationData.userId,
        startDate: new Date(allocationData.startDate),
        endDate: new Date(allocationData.endDate),
        allocationPercentage: allocationData.allocationPercentage,
        organizationId: allocationData.organizationId,
      });

      const savedAllocation =
        await this.resourceAllocationRepository.save(allocation);

      return {
        success: true,
        id: savedAllocation.id,
        allocation: savedAllocation,
      };
    } catch (error) {
      console.error('Error creating allocation:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create allocation');
    }
  }

  private async getAllocationsForResource(resourceId: string) {
    return this.resourceAllocationRepository.find({
      where: { resourceId },
    });
  }

  async createAllocationWithAudit(
    dto: CreateAllocationDto,
    auditData: {
      userId: string;
      organizationId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create allocation
      const allocation = queryRunner.manager.create(ResourceAllocation, {
        ...dto,
        organizationId: auditData.organizationId,
      });
      const savedAllocation = await queryRunner.manager.save(allocation);

      // Create audit log in same transaction
      const auditLog = queryRunner.manager.create(AuditLog, {
        userId: auditData.userId,
        organizationId: auditData.organizationId,
        entityType: 'resource_allocation',
        entityId: savedAllocation.id,
        action: 'create',
        newValue: dto,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
      });
      await queryRunner.manager.save(auditLog);

      // Commit transaction
      await queryRunner.commitTransaction();
      return savedAllocation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async calculateUserCapacity(
    userEmail: string,
    organizationId: string,
  ): Promise<number> {
    try {
      // Get all tasks assigned to this user
      const tasks = await this.taskRepository.find({
        where: {
          assignedResources: Like(`%${userEmail}%`),
          organizationId,
        },
      });

      if (tasks.length === 0) {
        return 0;
      }

      // Calculate total estimated hours
      const totalHours = tasks.reduce((sum, task) => {
        return sum + (task.estimatedHours || 0);
      }, 0);

      // Calculate capacity based on 40-hour work week
      const weeksInMonth = 4.33; // Average weeks per month
      const availableHours = 40 * weeksInMonth; // 173.2 hours per month
      const capacityPercentage = (totalHours / availableHours) * 100;

      return Math.min(Math.round(capacityPercentage), 200); // Cap at 200%
    } catch (error) {
      console.error('Failed to calculate user capacity:', error);
      return 0;
    }
  }

  async getCapacitySummary(
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    workspaceId?: string,
    userId?: string,
    userRole?: string,
  ): Promise<any[]> {
    try {
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      // Get accessible workspace IDs (respects feature flag)
      const accessibleWorkspaceIds =
        await this.workspaceAccessService.getAccessibleWorkspaceIds(
          organizationId,
          userId,
          userRole,
        );

      // Build query for allocations in date range
      // Use tenant-aware query builder - organizationId filter is automatic
      const allocationQuery = this.resourceAllocationRepository
        .qb('allocation')
        .andWhere('allocation.startDate <= :endDate', { endDate })
        .andWhere('allocation.endDate >= :startDate', { startDate });

      // Filter by workspace if provided
      if (workspaceId) {
        // Verify workspace is accessible
        if (
          accessibleWorkspaceIds !== null &&
          !accessibleWorkspaceIds.includes(workspaceId)
        ) {
          return [];
        }

        // Get projects in workspace
        // TenantAwareRepository automatically scopes by organizationId
        const workspaceProjects = await this.projectRepository.find({
          where: {
            workspaceId,
          },
          select: ['id'],
        });

        if (workspaceProjects.length === 0) {
          return [];
        }

        const projectIds = workspaceProjects.map((p) => p.id);
        allocationQuery.andWhere('allocation.projectId IN (:...projectIds)', {
          projectIds,
        });
      } else if (accessibleWorkspaceIds !== null) {
        // Filter by accessible workspaces
        const accessibleProjects = await this.projectRepository.find({
          where: {
            organizationId,
            workspaceId: In(accessibleWorkspaceIds),
          },
          select: ['id'],
        });

        if (accessibleProjects.length === 0) {
          return [];
        }

        const projectIds = accessibleProjects.map((p) => p.id);
        allocationQuery.andWhere('allocation.projectId IN (:...projectIds)', {
          projectIds,
        });
      }

      const allocations = await allocationQuery.getMany();

      // Get all resources in organization
      // TenantAwareRepository automatically scopes by organizationId
      const resources = await this.resourceRepository.find({
        where: { isActive: true },
      });

      // Calculate days in range
      const daysDiff =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
      const weeksInRange = daysDiff / 7;

      // Aggregate by resource
      const summaryMap = new Map<string, any>();

      // Initialize all resources
      resources.forEach((resource) => {
        const totalCapacityHours = resource.capacityHoursPerWeek * weeksInRange;
        summaryMap.set(resource.id, {
          id: resource.id,
          displayName: resource.name || resource.email,
          totalCapacityHours,
          totalAllocatedHours: 0,
          utilizationPercentage: 0,
        });
      });

      // Aggregate allocations
      allocations.forEach((allocation) => {
        const resourceId = allocation.resourceId || allocation.userId;
        if (!resourceId || !summaryMap.has(resourceId)) {
          return;
        }

        const summary = summaryMap.get(resourceId);
        const resource = resources.find((r) => r.id === resourceId);
        if (!resource) return;

        // Calculate hours allocated for this allocation
        const allocationDays = Math.min(
          Math.ceil(
            (new Date(allocation.endDate).getTime() -
              new Date(allocation.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
          daysDiff,
        );
        const allocationWeeks = allocationDays / 7;
        const hoursPerWeek =
          (resource.capacityHoursPerWeek *
            (allocation.allocationPercentage || 0)) /
          100;
        const allocatedHours = hoursPerWeek * allocationWeeks;

        summary.totalAllocatedHours += allocatedHours;
      });

      // Calculate utilization percentages
      summaryMap.forEach((summary) => {
        if (summary.totalCapacityHours > 0) {
          summary.utilizationPercentage = Math.round(
            (summary.totalAllocatedHours / summary.totalCapacityHours) * 100,
          );
        }
      });

      return Array.from(summaryMap.values());
    } catch (error) {
      console.error('Error getting capacity summary:', error);
      throw new BadRequestException('Failed to get capacity summary');
    }
  }

  async getCapacityBreakdown(
    resourceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    userId?: string,
    userRole?: string,
  ): Promise<any[]> {
    try {
      // Verify resource belongs to organization
      // TenantAwareRepository automatically scopes by organizationId
      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      // Get accessible workspace IDs
      const accessibleWorkspaceIds =
        await this.workspaceAccessService.getAccessibleWorkspaceIds(
          organizationId,
          userId,
          userRole,
        );

      // Build allocation query
      const allocationQuery = this.resourceAllocationRepository
        .createQueryBuilder('allocation')
        .leftJoinAndSelect('allocation.resource', 'resource')
        .leftJoinAndSelect('allocation.task', 'task')
        .where('allocation.resourceId = :resourceId', { resourceId })
        .andWhere('allocation.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('allocation.startDate <= :endDate', { endDate })
        .andWhere('allocation.endDate >= :startDate', { startDate });

      // Filter by accessible workspaces if membership is enforced
      if (accessibleWorkspaceIds !== null) {
        const accessibleProjects = await this.projectRepository.find({
          where: {
            organizationId,
            workspaceId: In(accessibleWorkspaceIds),
          },
          select: ['id'],
        });

        if (accessibleProjects.length === 0) {
          return [];
        }

        const projectIds = accessibleProjects.map((p) => p.id);
        allocationQuery.andWhere('allocation.projectId IN (:...projectIds)', {
          projectIds,
        });
      }

      const allocations = await allocationQuery.getMany();

      if (allocations.length === 0) {
        return [];
      }

      // Get project details
      const projectIds = [
        ...new Set(allocations.map((a) => a.projectId).filter(Boolean)),
      ];
      const projects = await this.projectRepository.find({
        where: { id: In(projectIds) },
        select: ['id', 'name', 'workspaceId'],
      });

      const projectMap = new Map(projects.map((p) => [p.id, p]));

      // Calculate days in range
      const daysDiff =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
      const weeksInRange = daysDiff / 7;

      // Aggregate by project
      const breakdownMap = new Map<string, any>();

      allocations.forEach((allocation) => {
        if (!allocation.projectId) return;

        const project = projectMap.get(allocation.projectId);
        if (!project) return;

        if (!breakdownMap.has(allocation.projectId)) {
          breakdownMap.set(allocation.projectId, {
            projectId: allocation.projectId,
            projectName: project.name,
            workspaceId: project.workspaceId,
            totalAllocatedHours: 0,
            percentageOfResourceTime: 0,
          });
        }

        const breakdown = breakdownMap.get(allocation.projectId);

        // Calculate hours for this allocation
        const allocationDays = Math.min(
          Math.ceil(
            (new Date(allocation.endDate).getTime() -
              new Date(allocation.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
          daysDiff,
        );
        const allocationWeeks = allocationDays / 7;
        const hoursPerWeek =
          (resource.capacityHoursPerWeek *
            (allocation.allocationPercentage || 0)) /
          100;
        const allocatedHours = hoursPerWeek * allocationWeeks;

        breakdown.totalAllocatedHours += allocatedHours;
      });

      // Calculate percentage of resource time
      const totalCapacityHours = resource.capacityHoursPerWeek * weeksInRange;
      breakdownMap.forEach((breakdown) => {
        if (totalCapacityHours > 0) {
          breakdown.percentageOfResourceTime = Math.round(
            (breakdown.totalAllocatedHours / totalCapacityHours) * 100,
          );
        }
      });

      return Array.from(breakdownMap.values());
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting capacity breakdown:', error);
      throw new BadRequestException('Failed to get capacity breakdown');
    }
  }

  async getSkillsFacet(
    organizationId: string,
    userId?: string,
    userRole?: string,
  ): Promise<any[]> {
    try {
      // Get accessible workspace IDs
      const accessibleWorkspaceIds =
        await this.workspaceAccessService.getAccessibleWorkspaceIds(
          organizationId,
          userId,
          userRole,
        );

      // Get all active resources in organization
      // TenantAwareRepository automatically scopes by organizationId
      const resources = await this.resourceRepository.find({
        where: { isActive: true },
        select: ['id', 'skills'],
      });

      // Aggregate skills
      const skillMap = new Map<string, number>();

      resources.forEach((resource) => {
        if (resource.skills && Array.isArray(resource.skills)) {
          resource.skills.forEach((skill: string) => {
            if (skill && skill.trim()) {
              const skillName = skill.trim();
              skillMap.set(skillName, (skillMap.get(skillName) || 0) + 1);
            }
          });
        }
      });

      // Convert to array format
      return Array.from(skillMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting skills facet:', error);
      throw new BadRequestException('Failed to get skills facet');
    }
  }

  /**
   * Phase 2: Get conflicts from ResourceConflict entity
   */
  async getConflictsFromEntity(
    organizationId: string,
    resourceId?: string,
    startDate?: string,
    endDate?: string,
    severity?: string,
    resolved?: boolean,
  ): Promise<{ data: ResourceConflict[] }> {
    try {
      const where: any = { organizationId };

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (severity) {
        where.severity = severity;
      }

      if (resolved !== undefined) {
        where.resolved = resolved;
      }

      if (startDate || endDate) {
        if (startDate && endDate) {
          where.conflictDate = Between(new Date(startDate), new Date(endDate));
        } else if (startDate) {
          where.conflictDate = MoreThanOrEqual(new Date(startDate));
        } else if (endDate) {
          where.conflictDate = LessThanOrEqual(new Date(endDate));
        }
      }

      const conflicts = await this.conflictRepository.find({
        where,
        order: { conflictDate: 'ASC', severity: 'DESC' },
        relations: ['resource'],
      });

      return { data: conflicts };
    } catch (error) {
      console.error('Error getting conflicts from entity:', error);
      throw new BadRequestException('Failed to get conflicts');
    }
  }

  /**
   * Phase 2: Get capacity view with weekly rollup per resource
   */
  async getCapacityResources(
    organizationId: string,
    startDate: string,
    endDate: string,
    workspaceId?: string,
  ): Promise<{
    data: Array<{
      resourceId: string;
      resourceName: string;
      weeks: Array<{
        weekStart: string;
        weekEnd: string;
        totalHard: number;
        totalSoft: number;
        total: number;
        remaining: number;
      }>;
    }>;
  }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get resources (filter by workspace if provided)
      const resourceWhere: any = { organizationId, isActive: true };
      if (workspaceId) {
        resourceWhere.workspaceId = workspaceId;
      }

      const resources = await this.resourceRepository.find({
        where: resourceWhere,
      });

      // Get allocations in date range
      const allocationWhere: any = {
        organizationId,
        startDate: LessThanOrEqual(end),
        endDate: MoreThanOrEqual(start),
        type: Not(AllocationType.GHOST),
      };

      if (workspaceId) {
        // Get project IDs in workspace
        const projects = await this.projectRepository.find({
          where: { organizationId, workspaceId },
          select: ['id'],
        });
        const projectIds = projects.map((p) => p.id);
        if (projectIds.length > 0) {
          allocationWhere.projectId = In(projectIds);
        } else {
          // No projects in workspace, return empty
          return { data: [] };
        }
      }

      const allocations = await this.resourceAllocationRepository.find({
        where: allocationWhere,
      });

      // Group by resource and calculate weekly totals
      const result = resources.map((resource) => {
        const resourceAllocations = allocations.filter(
          (a) => a.resourceId === resource.id,
        );

        // Calculate weeks
        const weeks: Array<{
          weekStart: string;
          weekEnd: string;
          totalHard: number;
          totalSoft: number;
          total: number;
          remaining: number;
        }> = [];

        let currentWeekStart = new Date(start);
        while (currentWeekStart <= end) {
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(weekEnd.getDate() + 6); // 7 days including start
          if (weekEnd > end) weekEnd.setTime(end.getTime());

          let totalHard = 0;
          let totalSoft = 0;

          // Sum allocations for this week
          for (const alloc of resourceAllocations) {
            const allocStart = new Date(alloc.startDate);
            const allocEnd = new Date(alloc.endDate);

            // Check if allocation overlaps with this week
            if (allocStart <= weekEnd && allocEnd >= currentWeekStart) {
              const percentage = alloc.allocationPercentage || 0;
              if (alloc.type === AllocationType.HARD) {
                totalHard += percentage;
              } else if (alloc.type === AllocationType.SOFT) {
                totalSoft += percentage;
              }
            }
          }

          const total = totalHard + totalSoft;
          const remaining = Math.max(0, 100 - total);

          weeks.push({
            weekStart: currentWeekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            totalHard: Math.round(totalHard * 10) / 10,
            totalSoft: Math.round(totalSoft * 10) / 10,
            total: Math.round(total * 10) / 10,
            remaining: Math.round(remaining * 10) / 10,
          });

          // Move to next week
          currentWeekStart = new Date(weekEnd);
          currentWeekStart.setDate(currentWeekStart.getDate() + 1);
        }

        return {
          resourceId: resource.id,
          resourceName: resource.name || 'Unknown',
          weeks,
        };
      });

      return { data: result };
    } catch (error) {
      console.error('Error getting capacity resources:', error);
      throw new BadRequestException('Failed to get capacity resources');
    }
  }
}
