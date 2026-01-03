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
import { CapacityMathHelper } from './helpers/capacity-math.helper';

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
      // Debug: Log the DTO to see what we're receiving
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] CreateAllocationDto for HOURS:', {
          hoursPerWeek: createAllocationDto.hoursPerWeek,
          hoursPerDay: createAllocationDto.hoursPerDay,
          unitsType: createAllocationDto.unitsType,
        });
      }

      if (
        (createAllocationDto.hoursPerDay === null || createAllocationDto.hoursPerDay === undefined) &&
        (createAllocationDto.hoursPerWeek === null || createAllocationDto.hoursPerWeek === undefined)
      ) {
        throw new BadRequestException(
          'hoursPerDay or hoursPerWeek is required when unitsType is HOURS',
        );
      }
      // Phase 3: Convert hours to percentage using CapacityMathHelper
      // Load resource to get capacityHoursPerWeek
      const resource = await this.resourceRepository.findOne({
        where: { id: createAllocationDto.resourceId },
        select: ['id', 'capacityHoursPerWeek'],
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      if (createAllocationDto.hoursPerWeek !== null && createAllocationDto.hoursPerWeek !== undefined) {
        hoursPerWeek = createAllocationDto.hoursPerWeek;
      } else if (createAllocationDto.hoursPerDay !== null && createAllocationDto.hoursPerDay !== undefined) {
        // Convert hoursPerDay to hoursPerWeek: hoursPerDay * 5 (assume 5 days/week)
        hoursPerWeek = createAllocationDto.hoursPerDay * 5;
      }

      // Ensure hoursPerWeek is set before calling helper
      if (hoursPerWeek === null || hoursPerWeek === undefined) {
        throw new BadRequestException(
          'hoursPerWeek or hoursPerDay must be provided and valid when unitsType is HOURS',
        );
      }

      // Use CapacityMathHelper to convert to percent (single source of truth)
      // Create temporary allocation object for helper
      const tempAllocation = {
        unitsType: UnitsType.HOURS,
        allocationPercentage: null,
      } as ResourceAllocation;
      allocationPercentage = CapacityMathHelper.toPercentOfWeek(
        tempAllocation,
        resource,
        hoursPerWeek,
        createAllocationDto.hoursPerDay !== null && createAllocationDto.hoursPerDay !== undefined
          ? createAllocationDto.hoursPerDay
          : null,
      );
      // Store converted percentage for conflict checking and rollups
    }

    // Load organization for governance validation
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Phase 3: Check for HARD overallocation (> 100%) - block with 409
    // Uses CapacityMathHelper via checkDailyAllocation
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
      // hoursPerWeek column doesn't exist in database - we convert HOURS to percentage for storage
      // hoursPerWeek: unitsType === UnitsType.HOURS ? hoursPerWeek : null,
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

    // Phase 3: Check for HARD breach before saving
    // If updating to HARD type (or already HARD with changed dates/percentage), check for breach
    const finalType = updateAllocationDto.type ?? allocation.type;
    const finalStartDate = updateAllocationDto.startDate
      ? new Date(updateAllocationDto.startDate)
      : allocation.startDate;
    const finalEndDate = updateAllocationDto.endDate
      ? new Date(updateAllocationDto.endDate)
      : allocation.endDate;
    const finalPercentage =
      updateAllocationDto.allocationPercentage ?? allocation.allocationPercentage;

    // Check if type is HARD and would breach
    if (finalType === AllocationType.HARD) {
      const conflictCheck = await this.checkDailyAllocation(
        organizationId,
        allocation.resourceId,
        finalStartDate,
        finalEndDate,
        finalPercentage!,
        id, // Exclude this allocation
      );

      if (conflictCheck.hasConflict) {
        this.logger.warn('HARD_allocation_blocked_over_100_on_update', {
          organizationId,
          resourceId: allocation.resourceId,
          allocationId: id,
          totalAllocation: conflictCheck.maxTotal,
          conflictDates: conflictCheck.conflictDates,
        });

        throw new ConflictException(
          `HARD allocation would exceed 100% capacity. ` +
            `Maximum total allocation: ${conflictCheck.maxTotal.toFixed(1)}%`,
        );
      }
    }

    // Store old date range for recompute window
    const oldStartDate = allocation.startDate;
    const oldEndDate = allocation.endDate;

    // Update only provided fields (respects explicit values from client)
    Object.assign(allocation, updateAllocationDto);
    const saved = await this.allocationRepository.save(allocation);

    // Phase 3: Recompute conflicts for impacted window
    // Window must cover both old range and new range
    const recomputeStart = new Date(
      Math.min(
        oldStartDate.getTime(),
        saved.startDate.getTime(),
      ),
    );
    const recomputeEnd = new Date(
      Math.max(
        oldEndDate.getTime(),
        saved.endDate.getTime(),
      ),
    );

    this.recomputeConflicts(
      organizationId,
      saved.resourceId,
      recomputeStart,
      recomputeEnd,
    ).catch((error) => {
      console.error('Failed to recompute conflicts:', error);
      // Don't fail the update if recompute fails
    });

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

    // Phase 3: Recompute conflicts for deleted window
    this.recomputeConflicts(
      organizationId,
      resourceId,
      startDate,
      endDate,
    ).catch((error) => {
      console.error('Failed to recompute conflicts after delete:', error);
      // Don't fail the delete if recompute fails
    });

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

    // Load resource for capacity math normalization
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      select: ['id', 'capacityHoursPerWeek'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Compute currentHardLoad: sum of HARD allocations using CapacityMathHelper
    const currentHardLoad = existingAllocations
      .filter((a) => a.type === AllocationType.HARD)
      .reduce((sum, a) => sum + CapacityMathHelper.toPercentOfWeek(a, resource), 0);

    // Compute currentSoftLoad: sum of SOFT allocations using CapacityMathHelper
    const currentSoftLoad = existingAllocations
      .filter((a) => a.type === AllocationType.SOFT)
      .reduce((sum, a) => sum + CapacityMathHelper.toPercentOfWeek(a, resource), 0);

    // Compute projectedTotal using helper for new allocation
    // Only include new allocation if it's HARD or SOFT (exclude GHOST)
    let projectedTotal = currentHardLoad + currentSoftLoad;
    if (
      newAllocationType === AllocationType.HARD ||
      newAllocationType === AllocationType.SOFT
    ) {
      const newAlloc = {
        unitsType: UnitsType.PERCENT,
        allocationPercentage: newAllocationPercentage,
      } as ResourceAllocation;
      projectedTotal += CapacityMathHelper.toPercentOfWeek(newAlloc, resource);
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
   * Phase 3: Check daily allocation totals to detect conflicts
   * Returns true if any day would exceed 100% after adding the new allocation
   * Uses CapacityMathHelper for consistent math normalization
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
    // Load resource once for capacityHoursPerWeek
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      select: ['id', 'capacityHoursPerWeek'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

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

    // Create temporary allocation for new allocation percentage
    const newAlloc = {
      unitsType: UnitsType.PERCENT,
      allocationPercentage: newAllocationPercentage,
    } as ResourceAllocation;

    // Check each day in the date range
    const conflictDates: string[] = [];
    let maxTotal = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      // Use helper for new allocation
      let dayTotal = CapacityMathHelper.toPercentOfWeek(newAlloc, resource);

      // Sum existing allocations for this day using helper
      for (const alloc of existingAllocations) {
        const allocStart = new Date(alloc.startDate);
        const allocEnd = new Date(alloc.endDate);
        if (current >= allocStart && current <= allocEnd) {
          // Use helper to normalize (handles both PERCENT and HOURS)
          dayTotal += CapacityMathHelper.toPercentOfWeek(alloc, resource);
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
   * Phase 3: Create conflict rows for SOFT allocations that exceed 100%
   * Uses CapacityMathHelper for consistent math normalization
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
    // Load resource for capacity math normalization
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      select: ['id', 'capacityHoursPerWeek'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

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
      // Note: This is for SOFT allocations only, so unitsType is PERCENT (already converted)
      const newAlloc = {
        id: newAllocationId,
        startDate,
        endDate,
        allocationPercentage: newAllocationPercentage,
        projectId,
        type: AllocationType.SOFT, // This is a SOFT allocation
        unitsType: UnitsType.PERCENT, // Already converted to percent
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

      // Calculate total for this day using CapacityMathHelper
      const total = dayAllocations.reduce(
        (sum, a) => sum + CapacityMathHelper.toPercentOfWeek(a, resource),
        0,
      );

      if (total > 100) {
        conflictsByDate.set(dateStr, dayAllocations);
      }

      current.setDate(current.getDate() + 1);
    }

    // Create conflict rows for each day that exceeds 100%
    for (const [dateStr, allocations] of conflictsByDate) {
      // Calculate total using helper
      const total = allocations.reduce(
        (sum, a) => sum + CapacityMathHelper.toPercentOfWeek(a, resource),
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
            // taskId removed - column doesn't exist in database
            // taskId: a.taskId,
            taskName: 'Unknown', // Task relation not available
            allocation: CapacityMathHelper.toPercentOfWeek(a, resource),
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

  /**
   * Phase 3: Recompute conflicts for a resource over a date range
   *
   * Rules:
   * - If total allocation > 100 for a day, upsert conflict row
   * - If total allocation <= 100 for a day, delete conflict row (both resolved and unresolved)
   * - Uses CapacityMathHelper for consistent math
   */
  private async recomputeConflicts(
    organizationId: string,
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Load resource for capacity math
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      select: ['id', 'capacityHoursPerWeek'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Get all allocations for this resource in the date range
    const allocations = await this.allocationRepository.find({
      where: {
        organizationId,
        resourceId,
        type: Not(AllocationType.GHOST),
      },
    });

    // Filter to overlapping allocations
    const overlapping = allocations.filter((alloc) => {
      const allocStart = new Date(alloc.startDate);
      const allocEnd = new Date(alloc.endDate);
      return allocStart <= endDate && allocEnd >= startDate;
    });

    // Check each day in the range
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayAllocations: ResourceAllocation[] = [];

      // Collect allocations active on this day
      for (const alloc of overlapping) {
        const allocStart = new Date(alloc.startDate);
        const allocEnd = new Date(alloc.endDate);
        if (current >= allocStart && current <= allocEnd) {
          dayAllocations.push(alloc);
        }
      }

      // Calculate total using CapacityMathHelper
      const total = dayAllocations.reduce(
        (sum, a) => sum + CapacityMathHelper.toPercentOfWeek(a, resource),
        0,
      );

      // Check if conflict exists for this day
      const existingConflict = await this.conflictRepository.findOne({
        where: {
          organizationId,
          resourceId,
          conflictDate: new Date(dateStr),
        },
      });

      if (total > 100) {
        // Upsert conflict
        const projectIds = dayAllocations
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

        if (existingConflict) {
          // Update existing conflict
          existingConflict.totalAllocation = total;
          existingConflict.severity = severity;
          existingConflict.affectedProjects = dayAllocations.map((a) => ({
            projectId: a.projectId || '',
            projectName: projectMap.get(a.projectId || '') || 'Unknown',
            taskName: 'Unknown',
            allocation: CapacityMathHelper.toPercentOfWeek(a, resource),
          }));
          // If conflict was resolved but now exists again, keep resolved state
          // (user must explicitly reopen if they want to)
          await this.conflictRepository.save(existingConflict);
        } else {
          // Create new conflict
          const conflict = this.conflictRepository.create({
            organizationId,
            resourceId,
            conflictDate: new Date(dateStr),
            totalAllocation: total,
            severity,
            affectedProjects: dayAllocations.map((a) => ({
              projectId: a.projectId || '',
              projectName: projectMap.get(a.projectId || '') || 'Unknown',
              taskName: 'Unknown',
              allocation: CapacityMathHelper.toPercentOfWeek(a, resource),
            })),
            resolved: false,
          });
          await this.conflictRepository.save(conflict);
        }
      } else {
        // Delete conflict if it exists (conflict no longer exists)
        if (existingConflict) {
          await this.conflictRepository.remove(existingConflict);
        }
      }

      current.setDate(current.getDate() + 1);
    }
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
