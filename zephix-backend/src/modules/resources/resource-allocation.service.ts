import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Between, DataSource, In, Not } from 'typeorm';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { Resource } from './entities/resource.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { Organization } from '../../organizations/entities/organization.entity';
import { AllocationType } from './enums/allocation-type.enum';
import { BookingSource } from './enums/booking-source.enum';
import { UnitsType } from './enums/units-type.enum';
import { getResourceSettings } from '../../organizations/utils/resource-settings.util';
import { ResourceTimelineService } from './services/resource-timeline.service';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ResourceAllocationService {
  private readonly logger = new Logger(ResourceAllocationService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(ResourceAllocation))
    private allocationRepository: TenantAwareRepository<ResourceAllocation>,
    @Inject(getTenantAwareRepositoryToken(UserDailyCapacity))
    private capacityRepository: TenantAwareRepository<UserDailyCapacity>,
    @Inject(getTenantAwareRepositoryToken(Resource))
    private resourceRepository: TenantAwareRepository<Resource>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(ResourceConflict)
    private conflictRepository: Repository<ResourceConflict>,
    private dataSource: DataSource,
    private timelineService: ResourceTimelineService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  // Standard CRUD methods for consistent API
  async create(
    createAllocationDto: CreateAllocationDto,
    organizationId: string,
    userId: string,
  ) {
    // Apply defaults: SOFT for type, MANUAL for bookingSource, PERCENT for unitsType
    const type = createAllocationDto.type ?? AllocationType.SOFT;
    const bookingSource =
      createAllocationDto.bookingSource ?? BookingSource.MANUAL;
    const unitsType = createAllocationDto.unitsType ?? UnitsType.PERCENT;

    // Phase 2: Validate unitsType and enforce only one units field
    let allocationPercentage: number | null = null;
    let hoursPerWeek: number | null = null;

    if (unitsType === UnitsType.PERCENT) {
      if (!createAllocationDto.allocationPercentage) {
        throw new BadRequestException(
          'allocationPercentage is required when unitsType is PERCENT',
        );
      }
      allocationPercentage = createAllocationDto.allocationPercentage;
      // Ensure hours fields are null
      hoursPerWeek = null;
    } else if (unitsType === UnitsType.HOURS) {
      if (!createAllocationDto.hoursPerDay && !createAllocationDto.hoursPerWeek) {
        throw new BadRequestException(
          'hoursPerDay or hoursPerWeek is required when unitsType is HOURS',
        );
      }
      // Convert hours to percentage for conflict checking (assuming 8 hours/day = 100%)
      // For now, we'll use hoursPerWeek if provided, or calculate from hoursPerDay
      if (createAllocationDto.hoursPerWeek) {
        hoursPerWeek = createAllocationDto.hoursPerWeek;
        // Convert to percentage: (hoursPerWeek / 40) * 100
        allocationPercentage = (hoursPerWeek / 40) * 100;
      } else if (createAllocationDto.hoursPerDay) {
        // Convert hoursPerDay to percentage: (hoursPerDay / 8) * 100
        allocationPercentage = (createAllocationDto.hoursPerDay / 8) * 100;
        hoursPerWeek = createAllocationDto.hoursPerDay * 5; // Assume 5 days/week
      }
      // Ensure allocationPercentage field is null when using HOURS
      // But we still need it for conflict checking, so we'll store it
    }

    // Load organization for governance validation
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Phase 2: Check for HARD overallocation (> 100%) - block with 409
    if (type === AllocationType.HARD) {
      const conflictCheck = await this.checkDailyAllocation(
        organizationId,
        createAllocationDto.resourceId,
        new Date(createAllocationDto.startDate),
        new Date(createAllocationDto.endDate),
        allocationPercentage!,
        undefined, // No existing allocation ID for create
      );

      if (conflictCheck.hasConflict) {
        this.logger.warn('HARD_allocation_blocked_over_100', {
          organizationId,
          resourceId: createAllocationDto.resourceId,
          totalAllocation: conflictCheck.maxTotal,
          dates: conflictCheck.conflictDates,
        });

        throw new ConflictException(
          `HARD allocation would exceed 100% capacity. ` +
            `Maximum total allocation: ${conflictCheck.maxTotal.toFixed(1)}%`,
        );
      }
    }

    // Validate governance (justification rules, etc.)
    await this.validateGovernance(
      organization,
      createAllocationDto.resourceId,
      new Date(createAllocationDto.startDate),
      new Date(createAllocationDto.endDate),
      allocationPercentage!,
      type,
      createAllocationDto.justification,
      undefined, // No existing allocation ID for create
    );

    const allocation = this.allocationRepository.create({
      ...createAllocationDto,
      allocationPercentage: unitsType === UnitsType.PERCENT ? allocationPercentage : null,
      hoursPerWeek: unitsType === UnitsType.HOURS ? hoursPerWeek : null,
      unitsType,
      type,
      bookingSource,
      organizationId,
      userId,
    });

    const saved = await this.allocationRepository.save(allocation);

    // Phase 2: For SOFT allocations, check if > 100% and create conflict rows
    if (type === AllocationType.SOFT) {
      await this.createConflictRowsIfNeeded(
        organizationId,
        createAllocationDto.resourceId,
        new Date(createAllocationDto.startDate),
        new Date(createAllocationDto.endDate),
        allocationPercentage!,
        saved.id,
        createAllocationDto.projectId,
      );
    }

    // Log if allocation was saved with justification
    if (saved.justification && saved.justification.trim()) {
      this.logger.log('allocation_justified', {
        organizationId,
        resourceId: saved.resourceId,
        allocationId: saved.id,
        allocationPercentage: saved.allocationPercentage,
        // Do NOT log justification text (may contain PII)
      });
    }

    // Update timeline asynchronously (non-blocking)
    this.timelineService
      .updateTimeline(
        organizationId,
        createAllocationDto.resourceId,
        new Date(createAllocationDto.startDate),
        new Date(createAllocationDto.endDate),
      )
      .catch((error) => {
        // Log but don't fail the request
        console.error('Failed to update timeline:', error);
      });

    return saved;
  }

  async findAll(
    organizationId: string,
    resourceId?: string,
    projectId?: string,
  ) {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    const where: any = {};

    if (resourceId) where.resourceId = resourceId;
    if (projectId) where.projectId = projectId;

    // TenantAwareRepository automatically adds organizationId filter
    return this.allocationRepository.find({
      where,
      relations: ['resource'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string) {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const allocation = await this.allocationRepository.findOne({
      where: { id },
      relations: ['resource'],
    });

    if (!allocation) {
      throw new NotFoundException('Resource allocation not found');
    }

    return allocation;
  }

  async update(
    id: string,
    updateAllocationDto: UpdateAllocationDto,
    organizationId: string,
  ) {
    const allocation = await this.findOne(id, organizationId);

    // Load organization for governance validation
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // If updating allocation percentage, dates, or type, validate governance
    if (
      updateAllocationDto.allocationPercentage !== undefined ||
      updateAllocationDto.startDate !== undefined ||
      updateAllocationDto.endDate !== undefined ||
      updateAllocationDto.type !== undefined
    ) {
      const startDate = updateAllocationDto.startDate
        ? new Date(updateAllocationDto.startDate)
        : allocation.startDate;
      const endDate = updateAllocationDto.endDate
        ? new Date(updateAllocationDto.endDate)
        : allocation.endDate;
      const allocationPercentage =
        updateAllocationDto.allocationPercentage ??
        allocation.allocationPercentage;
      const type = updateAllocationDto.type ?? allocation.type;
      const justification =
        updateAllocationDto.justification ?? allocation.justification;

      await this.validateGovernance(
        organization,
        allocation.resourceId,
        startDate,
        endDate,
        allocationPercentage,
        type,
        justification,
        id, // Existing allocation ID for update
      );
    }

    // Update only provided fields (respects explicit values from client)
    Object.assign(allocation, updateAllocationDto);
    const saved = await this.allocationRepository.save(allocation);

    // Update timeline if dates or percentage changed
    if (
      updateAllocationDto.startDate ||
      updateAllocationDto.endDate ||
      updateAllocationDto.allocationPercentage
    ) {
      const startDate = updateAllocationDto.startDate
        ? new Date(updateAllocationDto.startDate)
        : allocation.startDate;
      const endDate = updateAllocationDto.endDate
        ? new Date(updateAllocationDto.endDate)
        : allocation.endDate;

      this.timelineService
        .updateTimeline(
          organizationId,
          allocation.resourceId,
          startDate,
          endDate,
        )
        .catch((error) => {
          console.error('Failed to update timeline:', error);
        });
    }

    // Log if allocation was updated with justification
    if (saved.justification && saved.justification.trim()) {
      this.logger.log('allocation_justified', {
        organizationId,
        resourceId: saved.resourceId,
        allocationId: saved.id,
        allocationPercentage: saved.allocationPercentage,
        // Do NOT log justification text (may contain PII)
      });
    }

    return saved;
  }

  async remove(id: string, organizationId: string) {
    const allocation = await this.findOne(id, organizationId);
    const resourceId = allocation.resourceId;
    const startDate = allocation.startDate;
    const endDate = allocation.endDate;

    await this.allocationRepository.remove(allocation);

    // Update timeline after deletion
    this.timelineService
      .updateTimeline(organizationId, resourceId, startDate, endDate)
      .catch((error) => {
        console.error('Failed to update timeline:', error);
      });

    return { message: 'Resource allocation deleted successfully' };
  }

  async findByResource(resourceId: string, organizationId: string) {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    return this.allocationRepository.find({
      where: { resourceId },
      relations: ['resource', 'project'],
      order: { startDate: 'ASC' },
    });
  }

  async findByProject(projectId: string, organizationId: string) {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    return this.allocationRepository.find({
      where: { projectId },
      relations: ['resource', 'project'],
      order: { startDate: 'ASC' },
    });
  }

  async createAllocation(
    organizationId: string,
    userId: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
  ) {
    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (allocationPercentage < 1 || allocationPercentage > 100) {
      throw new BadRequestException(
        'Allocation percentage must be between 1 and 100',
      );
    }

    // Check for conflicts
    const conflicts = await this.checkCapacityConflicts(
      organizationId,
      userId,
      startDate,
      endDate,
      allocationPercentage,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Resource overallocation detected',
        conflicts: conflicts,
        suggestions: await this.generateSuggestions(
          organizationId,
          startDate,
          endDate,
          allocationPercentage,
        ),
      });
    }

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create allocation with defaults
      const allocation = this.allocationRepository.create({
        organizationId,
        userId,
        projectId,
        startDate,
        endDate,
        allocationPercentage,
        type: AllocationType.SOFT, // Default for internal method
        bookingSource: BookingSource.MANUAL, // Default for internal method
      });

      const savedAllocation = await queryRunner.manager.save(allocation);

      // Update daily capacity with proper accumulation
      await this.updateDailyCapacity(
        queryRunner.manager,
        organizationId,
        userId,
        startDate,
        endDate,
        allocationPercentage,
      );

      await queryRunner.commitTransaction();
      return savedAllocation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async checkCapacityConflicts(
    organizationId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
  ): Promise<
    Array<{ date: Date; currentAllocation: number; wouldBe: number }>
  > {
    const dailyCapacities = await this.capacityRepository.find({
      where: {
        organizationId,
        userId,
        capacityDate: Between(startDate, endDate),
      },
    });

    const conflicts: Array<{
      date: Date;
      currentAllocation: number;
      wouldBe: number;
    }> = [];
    for (const capacity of dailyCapacities) {
      const newTotal = capacity.allocatedPercentage + allocationPercentage;
      if (newTotal > 100) {
        conflicts.push({
          date: capacity.capacityDate,
          currentAllocation: capacity.allocatedPercentage,
          wouldBe: newTotal,
        });
      }
    }

    return conflicts;
  }

  private async updateDailyCapacity(
    manager: any,
    organizationId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
  ) {
    // Fixed date enumeration - create new date objects
    const dates: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(new Date(current)); // Create new date object
      current.setDate(current.getDate() + 1);
    }

    // Batch update with proper accumulation
    for (const date of dates) {
      const existing = await manager.findOne(UserDailyCapacity, {
        where: { organizationId, userId, capacityDate: date },
      });

      if (existing) {
        existing.allocatedPercentage += allocationPercentage;
        await manager.save(UserDailyCapacity, existing);
      } else {
        await manager.save(UserDailyCapacity, {
          organizationId,
          userId,
          capacityDate: date,
          allocatedPercentage: allocationPercentage,
        });
      }
    }
  }

  private async generateSuggestions(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    requiredPercentage: number,
  ) {
    // Find users with capacity
    // Use tenant-aware query builder - organizationId filter is automatic
    const orgId = this.tenantContextService.assertOrganizationId();
    const availableUsers = await this.capacityRepository
      .qb('capacity')
      .select('capacity.userId')
      .addSelect('AVG(capacity.allocatedPercentage)', 'avgAllocation')
      .andWhere('capacity.capacityDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('capacity.userId')
      .having('AVG(capacity.allocatedPercentage) <= :maxAllocation', {
        maxAllocation: 100 - requiredPercentage,
      })
      .getRawMany();

    return availableUsers.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Validate governance rules before saving an allocation
   * - Hard cap rule: blocks if projectedTotal > hardCap
   * - Justification rule: requires justification if projectedTotal > requireJustificationAbove
   */
  private async validateGovernance(
    organization: Organization,
    resourceId: string,
    startDate: Date,
    endDate: Date,
    newAllocationPercentage: number,
    newAllocationType: AllocationType,
    justification: string | null | undefined,
    excludeAllocationId?: string, // For updates, exclude the current allocation
  ): Promise<void> {
    const settings = getResourceSettings(organization);

    // Find existing allocations that overlap with the date range
    // Use tenant-aware query builder - organizationId filter is automatic
    const queryBuilder = this.allocationRepository
      .qb('allocation')
      .andWhere('allocation.resourceId = :resourceId', { resourceId })
      .andWhere('allocation.type != :ghostType', {
        ghostType: AllocationType.GHOST,
      })
      // Date overlap condition: (startDate <= newEndDate AND endDate >= newStartDate)
      .andWhere(
        'allocation.startDate <= :endDate AND allocation.endDate >= :startDate',
        { startDate, endDate },
      );

    if (excludeAllocationId) {
      queryBuilder.andWhere('allocation.id != :excludeId', {
        excludeId: excludeAllocationId,
      });
    }

    const existingAllocations = await queryBuilder.getMany();

    // Compute currentHardLoad: sum of HARD allocations (excluding GHOST)
    const currentHardLoad = existingAllocations
      .filter((a) => a.type === AllocationType.HARD)
      .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);

    // Compute currentSoftLoad: sum of SOFT allocations (excluding GHOST)
    const currentSoftLoad = existingAllocations
      .filter((a) => a.type === AllocationType.SOFT)
      .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);

    // Compute projectedTotal
    // Only include new allocation if it's HARD or SOFT (exclude GHOST)
    let projectedTotal = currentHardLoad + currentSoftLoad;
    if (
      newAllocationType === AllocationType.HARD ||
      newAllocationType === AllocationType.SOFT
    ) {
      projectedTotal += newAllocationPercentage;
    }

    // Hard cap rule: block if projectedTotal exceeds hardCap
    if (projectedTotal > settings.hardCap) {
      // Log governance violation
      this.logger.warn('governance_violation_blocked', {
        organizationId: organization.id,
        resourceId,
        projectedLoad: projectedTotal,
        hardCap: settings.hardCap,
        currentHardLoad,
        currentSoftLoad,
        excludeAllocationId,
      });

      throw new BadRequestException(
        `Resource allocation would exceed hard cap of ${settings.hardCap}%. ` +
          `Current load: ${currentHardLoad + currentSoftLoad}%, ` +
          `Projected total: ${projectedTotal}%`,
      );
    }

    // Justification rule: require justification if projectedTotal exceeds threshold
    if (
      projectedTotal > settings.requireJustificationAbove &&
      (!justification || justification.trim() === '')
    ) {
      // Log justification trigger
      this.logger.log('governance_justification_triggered', {
        organizationId: organization.id,
        resourceId,
        projectedLoad: projectedTotal,
        requireJustificationAbove: settings.requireJustificationAbove,
        excludeAllocationId,
      });

      throw new BadRequestException(
        `Justification is required for allocations exceeding ${settings.requireJustificationAbove}%. ` +
          `Projected total: ${projectedTotal}%`,
      );
    }
  }

  /**
   * Phase 2: Check daily allocation totals to detect conflicts
   * Returns true if any day would exceed 100% after adding the new allocation
   */
  private async checkDailyAllocation(
    organizationId: string,
    resourceId: string,
    startDate: Date,
    endDate: Date,
    newAllocationPercentage: number,
    excludeAllocationId?: string,
  ): Promise<{
    hasConflict: boolean;
    maxTotal: number;
    conflictDates: string[];
  }> {
    // Get existing allocations that overlap with the date range
    const queryBuilder = this.allocationRepository
      .qb('allocation')
      .andWhere('allocation.organizationId = :organizationId', { organizationId })
      .andWhere('allocation.resourceId = :resourceId', { resourceId })
      .andWhere('allocation.type != :ghostType', {
        ghostType: AllocationType.GHOST,
      })
      .andWhere(
        'allocation.startDate <= :endDate AND allocation.endDate >= :startDate',
        { startDate, endDate },
      );

    if (excludeAllocationId) {
      queryBuilder.andWhere('allocation.id != :excludeId', {
        excludeId: excludeAllocationId,
      });
    }

    const existingAllocations = await queryBuilder.getMany();

    // Check each day in the date range
    const conflictDates: string[] = [];
    let maxTotal = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      let dayTotal = newAllocationPercentage;

      // Sum existing allocations for this day
      for (const alloc of existingAllocations) {
        const allocStart = new Date(alloc.startDate);
        const allocEnd = new Date(alloc.endDate);
        if (current >= allocStart && current <= allocEnd) {
          dayTotal += alloc.allocationPercentage || 0;
        }
      }

      if (dayTotal > 100) {
        conflictDates.push(dateStr);
      }
      maxTotal = Math.max(maxTotal, dayTotal);

      current.setDate(current.getDate() + 1);
    }

    return {
      hasConflict: conflictDates.length > 0,
      maxTotal,
      conflictDates,
    };
  }

  /**
   * Phase 2: Create conflict rows for SOFT allocations that exceed 100%
   */
  private async createConflictRowsIfNeeded(
    organizationId: string,
    resourceId: string,
    startDate: Date,
    endDate: Date,
    newAllocationPercentage: number,
    newAllocationId: string,
    projectId?: string,
  ): Promise<void> {
    // Get existing allocations that overlap
    const existingAllocations = await this.allocationRepository.find({
      where: {
        organizationId,
        resourceId,
        type: Not(AllocationType.GHOST),
      },
    });

    // Filter to overlapping allocations
    const overlapping = existingAllocations.filter((alloc) => {
      const allocStart = new Date(alloc.startDate);
      const allocEnd = new Date(alloc.endDate);
      return allocStart <= endDate && allocEnd >= startDate;
    });

    // Check each day and create conflict rows
    const current = new Date(startDate);
    const end = new Date(endDate);
    const conflictsByDate = new Map<string, ResourceAllocation[]>();

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayAllocations: ResourceAllocation[] = [];

      // Include new allocation (create a temporary object for calculation)
      const newAlloc = {
        id: newAllocationId,
        startDate,
        endDate,
        allocationPercentage: newAllocationPercentage,
        projectId,
        type: AllocationType.SOFT, // This is a SOFT allocation
      } as ResourceAllocation;
      dayAllocations.push(newAlloc);

      // Include overlapping existing allocations
      for (const alloc of overlapping) {
        const allocStart = new Date(alloc.startDate);
        const allocEnd = new Date(alloc.endDate);
        if (current >= allocStart && current <= allocEnd) {
          dayAllocations.push(alloc);
        }
      }

      // Calculate total for this day
      const total = dayAllocations.reduce(
        (sum, a) => sum + (a.allocationPercentage || 0),
        0,
      );

      if (total > 100) {
        conflictsByDate.set(dateStr, dayAllocations);
      }

      current.setDate(current.getDate() + 1);
    }

    // Create conflict rows for each day that exceeds 100%
    for (const [dateStr, allocations] of conflictsByDate) {
      const total = allocations.reduce(
        (sum, a) => sum + (a.allocationPercentage || 0),
        0,
      );

      // Check if conflict already exists for this resource and date
      const existing = await this.conflictRepository.findOne({
        where: {
          organizationId,
          resourceId,
          conflictDate: new Date(dateStr),
          resolved: false,
        },
      });

      if (!existing) {
        // Get project names for affected projects
        const projectIds = allocations
          .map((a) => a.projectId)
          .filter((id) => id) as string[];

        let projectMap = new Map<string, string>();
        if (projectIds.length > 0) {
          const projectRepo = this.dataSource.getRepository(Project);
          const projects = await projectRepo.find({
            where: { id: In(projectIds), organizationId },
            select: ['id', 'name'],
          });
          projectMap = new Map(projects.map((p) => [p.id, p.name]));
        }

        const severity = this.calculateSeverity(total);

        const conflict = this.conflictRepository.create({
          organizationId,
          resourceId,
          conflictDate: new Date(dateStr),
          totalAllocation: total,
          severity,
          affectedProjects: allocations.map((a) => ({
            projectId: a.projectId || '',
            projectName: projectMap.get(a.projectId || '') || 'Unknown',
            taskId: a.taskId,
            taskName: 'Unknown', // Could be populated from task lookup if needed
            allocation: a.allocationPercentage || 0,
          })),
          resolved: false,
        });

        await this.conflictRepository.save(conflict);

        this.logger.log('soft_allocation_conflict_created', {
          organizationId,
          resourceId,
          conflictDate: dateStr,
          totalAllocation: total,
          severity,
        });
      }
    }
  }

  /**
   * Calculate severity based on total allocation percentage
   */
  private calculateSeverity(
    totalAllocation: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (totalAllocation <= 110) return 'low';
    if (totalAllocation <= 125) return 'medium';
    if (totalAllocation <= 150) return 'high';
    return 'critical';
  }

  async getTaskBasedHeatMap(organizationId: string) {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    // Get all resources - TenantAwareRepository automatically scopes by organizationId
    const resources = await this.resourceRepository.find({});

    // Get all active tasks
    // Note: Task entity may need TenantAwareRepository if it has organizationId
    const tasks = await this.taskRepository.find({
      where: {
        organizationId: orgId,
        status: In(['pending', 'in_progress']),
      },
    });

    // Calculate allocations for next 4 weeks
    const heatMap = [];
    const today = new Date();

    for (const resource of resources) {
      const weekData = [];

      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // Count tasks assigned to this resource in this week
        const tasksInWeek = tasks.filter((task) => {
          const startDate = task.startDate || task.createdAt;
          const endDate = task.endDate || task.dueDate || startDate;

          return (
            task.assignedTo === resource.userId &&
            new Date(startDate) <= weekEnd &&
            new Date(endDate) >= weekStart
          );
        });

        // Simple model: each task = 25% allocation
        const allocation = tasksInWeek.length * 25;

        weekData.push({
          weekStart: weekStart.toISOString().split('T')[0],
          taskCount: tasksInWeek.length,
          allocation: allocation,
          status:
            allocation > 100
              ? 'critical'
              : allocation > 75
                ? 'warning'
                : 'available',
          tasks: tasksInWeek.map((t) => ({
            id: t.id,
            name: t.name || 'Task', // The entity maps 'title' column to 'name' property
            projectId: t.projectId,
          })),
        });
      }

      heatMap.push({
        resourceId: resource.id,
        resourceName: resource.name || 'Unknown',
        weeks: weekData,
      });
    }

    return heatMap;
  }
}
