import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { WorkTask } from '../entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkResourceAllocation } from '../entities/work-resource-allocation.entity';
import { CreateSprintDto } from '../dto/create-sprint.dto';
import { UpdateSprintDto } from '../dto/update-sprint.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { In } from 'typeorm';
import {
  countWorkdays,
  computeAllocatedHours,
  computeLoadFromPoints,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_HOURS_PER_POINT,
  type SprintCapacityResult,
  type AllocationInput,
} from '../utils/sprint-capacity.utils';
import {
  buildBurndownBuckets,
  type DailyBucket,
  type BurndownTask,
} from '../utils/burndown.utils';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class SprintsService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Sprint))
    private readonly sprintRepo: TenantAwareRepository<Sprint>,
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private readonly projectRepo: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(WorkResourceAllocation))
    private readonly allocationRepo: TenantAwareRepository<WorkResourceAllocation>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async assertWorkspaceAccess(
    auth: AuthContext,
    workspaceId: string,
  ): Promise<void> {
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!canAccess) {
      throw new BadRequestException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace access denied',
      });
    }
  }

  /**
   * List sprints for a project.
   */
  async listSprints(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
  ): Promise<Sprint[]> {
    await this.assertWorkspaceAccess(auth, workspaceId);

    return this.sprintRepo.find({
      where: { workspaceId, projectId } as any,
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Get a single sprint by ID.
   */
  async getSprint(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
  ): Promise<Sprint> {
    await this.assertWorkspaceAccess(auth, workspaceId);

    const sprint = await this.sprintRepo.findOne({
      where: { id: sprintId, workspaceId } as any,
    });
    if (!sprint) {
      throw new NotFoundException({
        code: 'SPRINT_NOT_FOUND',
        message: 'Sprint not found',
      });
    }
    return sprint;
  }

  /**
   * Get sprint with task summary (points committed, completed, remaining).
   */
  async getSprintWithStats(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
  ): Promise<Sprint & { stats: { committed: number; completed: number; remaining: number; taskCount: number } }> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    const tasks = await this.taskRepo.find({
      where: { sprintId, workspaceId } as any,
    });

    const committed = tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0,
    );
    const completed = tasks
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return {
      ...sprint,
      stats: {
        committed,
        completed,
        remaining: committed - completed,
        taskCount: tasks.length,
      },
    };
  }

  /**
   * Create a new sprint.
   */
  async createSprint(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateSprintDto,
  ): Promise<Sprint> {
    await this.assertWorkspaceAccess(auth, workspaceId);

    // Verify project belongs to workspace
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId, workspaceId } as any,
    });
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found in workspace',
      });
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException({
        code: 'INVALID_SPRINT_DATES',
        message: 'End date must be after start date',
      });
    }

    // Check no overlapping active sprint for same project
    const overlapping = await this.sprintRepo
      .qb('sprint')
      .where('sprint.projectId = :projectId', { projectId: dto.projectId })
      .andWhere('sprint.status IN (:...statuses)', {
        statuses: [SprintStatus.ACTIVE, SprintStatus.PLANNING],
      })
      .andWhere('sprint.startDate < :endDate', { endDate: dto.endDate })
      .andWhere('sprint.endDate > :startDate', { startDate: dto.startDate })
      .getCount();

    if (overlapping > 0) {
      throw new BadRequestException({
        code: 'SPRINT_OVERLAP',
        message: 'Sprint dates overlap with an existing active or planning sprint',
      });
    }

    const sprint = this.sprintRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      projectId: dto.projectId,
      name: dto.name,
      goal: dto.goal || null,
      startDate: startDate as any,
      endDate: endDate as any,
      status: SprintStatus.PLANNING,
      createdByUserId: auth.userId,
    });

    return this.sprintRepo.save(sprint);
  }

  /**
   * Update sprint fields.
   */
  async updateSprint(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
    dto: UpdateSprintDto,
  ): Promise<Sprint> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    // Guard: completed/cancelled sprints are immutable (except status transition is checked below)
    if (
      sprint.status === SprintStatus.COMPLETED ||
      sprint.status === SprintStatus.CANCELLED
    ) {
      // Only allow status field (which will be rejected by validateStatusTransition anyway)
      const nonStatusFields = ['name', 'goal', 'startDate', 'endDate'] as const;
      const hasMutation = nonStatusFields.some(
        (f) => dto[f] !== undefined,
      );
      if (hasMutation) {
        throw new BadRequestException({
          code: 'SPRINT_IMMUTABLE',
          message: `Cannot modify a ${sprint.status} sprint`,
        });
      }
    }

    if (dto.name !== undefined) sprint.name = dto.name;
    if (dto.goal !== undefined) sprint.goal = dto.goal || null;
    if (dto.startDate !== undefined) sprint.startDate = new Date(dto.startDate) as any;
    if (dto.endDate !== undefined) sprint.endDate = new Date(dto.endDate) as any;
    if (dto.status !== undefined) {
      this.validateStatusTransition(sprint.status, dto.status);
      sprint.status = dto.status;

      // Freeze points when completing a sprint
      if (dto.status === SprintStatus.COMPLETED) {
        const tasks = await this.taskRepo.find({
          where: { sprintId, workspaceId } as any,
        });
        sprint.committedPoints = tasks.reduce(
          (sum, t) => sum + (t.storyPoints || 0),
          0,
        );
        sprint.completedPoints = tasks
          .filter((t) => t.status === 'DONE')
          .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        sprint.completedAt = new Date();
      }
    }

    return this.sprintRepo.save(sprint);
  }

  /**
   * Delete a sprint. Only PLANNING sprints can be deleted.
   * Tasks in the sprint get their sprintId cleared.
   */
  async deleteSprint(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
  ): Promise<void> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    if (sprint.status !== SprintStatus.PLANNING) {
      throw new BadRequestException({
        code: 'SPRINT_NOT_DELETABLE',
        message: 'Only sprints in PLANNING status can be deleted',
      });
    }

    // Clear sprintId from tasks
    await this.taskRepo
      .qb('task')
      .update()
      .set({ sprintId: null } as any)
      .where('sprintId = :sprintId', { sprintId })
      .execute();

    await this.sprintRepo.remove(sprint);
  }

  /**
   * Assign tasks to a sprint.
   */
  async assignTasks(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
    taskIds: string[],
  ): Promise<{ assigned: number }> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    if (sprint.status === SprintStatus.COMPLETED || sprint.status === SprintStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'SPRINT_CLOSED',
        message: 'Cannot assign tasks to a completed or cancelled sprint',
      });
    }

    // Verify all tasks belong to the same project and workspace
    const tasks = await this.taskRepo.find({
      where: { id: In(taskIds), workspaceId, projectId: sprint.projectId } as any,
    });

    if (tasks.length === 0) {
      throw new BadRequestException({
        code: 'NO_VALID_TASKS',
        message: 'No valid tasks found in this project',
      });
    }

    // Update sprintId
    for (const task of tasks) {
      task.sprintId = sprintId;
    }
    await this.taskRepo.save(tasks as any);

    return { assigned: tasks.length };
  }

  /**
   * Remove tasks from a sprint.
   */
  async removeTasks(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
    taskIds: string[],
  ): Promise<{ removed: number }> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    if (
      sprint.status === SprintStatus.COMPLETED ||
      sprint.status === SprintStatus.CANCELLED
    ) {
      throw new BadRequestException({
        code: 'SPRINT_CLOSED',
        message: 'Cannot remove tasks from a completed or cancelled sprint',
      });
    }

    const tasks = await this.taskRepo.find({
      where: { id: In(taskIds), sprintId, workspaceId } as any,
    });

    for (const task of tasks) {
      task.sprintId = null;
    }
    if (tasks.length > 0) {
      await this.taskRepo.save(tasks as any);
    }

    return { removed: tasks.length };
  }

  /**
   * Compute sprint capacity — read-only computed block.
   */
  async getSprintCapacity(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
  ): Promise<SprintCapacityResult> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    // 1. Workdays
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    const workdays = countWorkdays(sprintStart, sprintEnd);

    // 2. Tasks in sprint
    const tasks = await this.taskRepo.find({
      where: { sprintId, workspaceId } as any,
    });

    const committedStoryPoints = tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0,
    );
    const completedStoryPoints = tasks
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // 3. Allocations overlapping sprint range for this project
    const allocations = await this.allocationRepo.find({
      where: {
        workspaceId,
        projectId: sprint.projectId,
        deletedAt: null,
      } as any,
    });

    const allocInputs: AllocationInput[] = allocations.map((a) => ({
      allocationPercent: a.allocationPercent ?? 100,
      startDate: a.startDate ? new Date(a.startDate) : null,
      endDate: a.endDate ? new Date(a.endDate) : null,
    }));

    const hoursPerDay = DEFAULT_HOURS_PER_DAY;
    const hoursPerPoint = DEFAULT_HOURS_PER_POINT;

    const capacityHours = computeAllocatedHours(
      sprintStart,
      sprintEnd,
      allocInputs,
      hoursPerDay,
    );

    // 4. Load — use story points as proxy if no task estimate hours exist
    // (estimateHours column not yet on WorkTask entity)
    const loadHours = computeLoadFromPoints(committedStoryPoints, hoursPerPoint);
    const loadSource: 'estimates' | 'storyPoints' = 'storyPoints';

    return {
      capacityHours,
      loadHours,
      remainingHours: Math.round((capacityHours - loadHours) * 100) / 100,
      committedStoryPoints,
      completedStoryPoints,
      remainingStoryPoints: committedStoryPoints - completedStoryPoints,
      capacityBasis: {
        hoursPerDay,
        workdays,
        pointsToHoursRatio: hoursPerPoint,
        allocationCount: allocInputs.length,
        allocationSource: allocInputs.length > 0 ? 'allocations' : 'none',
        loadSource,
      },
    };
  }

  /**
   * Sprint burndown/burnup data — daily buckets of remaining/completed points.
   *
   * Scope rule:
   *  - ACTIVE: floating scope (live task data, totalPoints = current sum)
   *  - COMPLETED: frozen scope (totalPoints = sprint.committedPoints at completion)
   */
  async getSprintBurndown(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
  ): Promise<{
    sprintId: string;
    sprintName: string;
    startDate: string;
    endDate: string;
    totalPoints: number;
    scopeMode: 'live' | 'frozen';
    buckets: DailyBucket[];
  }> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    const tasks = await this.taskRepo.find({
      where: { sprintId, workspaceId } as any,
    });

    const burndownTasks: BurndownTask[] = tasks.map((t) => ({
      storyPoints: t.storyPoints || 0,
      completedAt: t.completedAt ? new Date(t.completedAt) : null,
      status: t.status,
    }));

    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);

    // Determine scope mode and total points
    const isFrozen =
      sprint.status === SprintStatus.COMPLETED &&
      sprint.committedPoints != null;
    const scopeMode: 'live' | 'frozen' = isFrozen ? 'frozen' : 'live';
    const totalPoints = isFrozen
      ? sprint.committedPoints!
      : burndownTasks.reduce((s, t) => s + t.storyPoints, 0);

    // For frozen sprints, override task list total to match frozen scope
    const adjustedTasks: BurndownTask[] = isFrozen
      ? burndownTasks // completions still come from task data; totalPoints is from frozen value
      : burndownTasks;

    const buckets = buildBurndownBuckets(
      sprintStart,
      sprintEnd,
      adjustedTasks,
      totalPoints, // pass explicit total for frozen scope
    );

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      startDate: String(sprint.startDate),
      endDate: String(sprint.endDate),
      totalPoints,
      scopeMode,
      buckets,
    };
  }

  /**
   * Sprint progress — lightweight summary for dashboard widgets.
   * Returns headline numbers + a slim 7-day sample of burndown buckets.
   */
  async getSprintProgress(
    auth: AuthContext,
    workspaceId: string,
    sprintId: string,
  ): Promise<{
    sprintId: string;
    sprintName: string;
    status: SprintStatus;
    startDate: string;
    endDate: string;
    totalPoints: number;
    completedPoints: number;
    remainingPoints: number;
    percentComplete: number;
    scopeMode: 'live' | 'frozen';
    burndownSample: DailyBucket[];
  }> {
    const sprint = await this.getSprint(auth, workspaceId, sprintId);

    const tasks = await this.taskRepo.find({
      where: { sprintId, workspaceId } as any,
    });

    const isFrozen =
      sprint.status === SprintStatus.COMPLETED &&
      sprint.committedPoints != null;
    const scopeMode: 'live' | 'frozen' = isFrozen ? 'frozen' : 'live';

    const burndownTasks: BurndownTask[] = tasks.map((t) => ({
      storyPoints: t.storyPoints || 0,
      completedAt: t.completedAt ? new Date(t.completedAt) : null,
      status: t.status,
    }));

    const totalPoints = isFrozen
      ? sprint.committedPoints!
      : burndownTasks.reduce((s, t) => s + t.storyPoints, 0);

    const completedPoints = isFrozen
      ? sprint.completedPoints ?? 0
      : burndownTasks
          .filter((t) => t.status === 'DONE')
          .reduce((s, t) => s + t.storyPoints, 0);

    const remainingPoints = totalPoints - completedPoints;
    const percentComplete =
      totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : 0;

    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    const allBuckets = buildBurndownBuckets(
      sprintStart,
      sprintEnd,
      burndownTasks,
      isFrozen ? totalPoints : undefined,
    );

    // Slim 7-day sample for performance: take evenly spaced buckets
    let burndownSample: DailyBucket[];
    if (allBuckets.length <= 7) {
      burndownSample = allBuckets;
    } else {
      const step = (allBuckets.length - 1) / 6;
      burndownSample = Array.from({ length: 7 }, (_, i) =>
        allBuckets[Math.round(i * step)],
      );
    }

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      startDate: String(sprint.startDate),
      endDate: String(sprint.endDate),
      totalPoints,
      completedPoints,
      remainingPoints,
      percentComplete,
      scopeMode,
      burndownSample,
    };
  }

  /**
   * Project velocity — rolling average of completed sprints.
   */
  async getProjectVelocity(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    window: number = 5,
  ): Promise<{
    window: number;
    sprints: Array<{
      sprintId: string;
      name: string;
      startDate: string;
      endDate: string;
      committedStoryPoints: number;
      completedStoryPoints: number;
    }>;
    rollingAverageCompletedPoints: number;
  }> {
    await this.assertWorkspaceAccess(auth, workspaceId);

    // Clamp window
    const w = Math.max(1, Math.min(window, 20));

    // Get last N completed sprints
    const completedSprints = await this.sprintRepo.find({
      where: {
        workspaceId,
        projectId,
        status: SprintStatus.COMPLETED,
      } as any,
      order: { endDate: 'DESC' },
      take: w,
    });

    // Use frozen points if available (set at completion time), else recompute live
    const sprintData = await Promise.all(
      completedSprints.map(async (sprint) => {
        if (sprint.committedPoints != null) {
          return {
            sprintId: sprint.id,
            name: sprint.name,
            startDate: String(sprint.startDate),
            endDate: String(sprint.endDate),
            committedStoryPoints: sprint.committedPoints,
            completedStoryPoints: sprint.completedPoints ?? 0,
          };
        }
        // Fallback for sprints completed before freeze columns existed
        const tasks = await this.taskRepo.find({
          where: { sprintId: sprint.id, workspaceId } as any,
        });
        const committed = tasks.reduce(
          (sum, t) => sum + (t.storyPoints || 0),
          0,
        );
        const completed = tasks
          .filter((t) => t.status === 'DONE')
          .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        return {
          sprintId: sprint.id,
          name: sprint.name,
          startDate: String(sprint.startDate),
          endDate: String(sprint.endDate),
          committedStoryPoints: committed,
          completedStoryPoints: completed,
        };
      }),
    );

    const totalCompleted = sprintData.reduce(
      (sum, s) => sum + s.completedStoryPoints,
      0,
    );
    const rollingAvg =
      sprintData.length > 0
        ? Math.round((totalCompleted / sprintData.length) * 100) / 100
        : 0;

    return {
      window: w,
      sprints: sprintData,
      rollingAverageCompletedPoints: rollingAvg,
    };
  }

  private validateStatusTransition(
    current: SprintStatus,
    target: SprintStatus,
  ): void {
    const allowed: Record<SprintStatus, SprintStatus[]> = {
      [SprintStatus.PLANNING]: [SprintStatus.ACTIVE, SprintStatus.CANCELLED],
      [SprintStatus.ACTIVE]: [SprintStatus.COMPLETED, SprintStatus.CANCELLED],
      [SprintStatus.COMPLETED]: [],
      [SprintStatus.CANCELLED]: [],
    };

    if (!allowed[current]?.includes(target)) {
      throw new BadRequestException({
        code: 'INVALID_SPRINT_TRANSITION',
        message: `Cannot transition sprint from ${current} to ${target}`,
      });
    }
  }
}
