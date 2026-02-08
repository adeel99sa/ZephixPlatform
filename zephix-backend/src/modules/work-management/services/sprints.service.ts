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
import { CreateSprintDto } from '../dto/create-sprint.dto';
import { UpdateSprintDto } from '../dto/update-sprint.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { In } from 'typeorm';

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

    if (dto.name !== undefined) sprint.name = dto.name;
    if (dto.goal !== undefined) sprint.goal = dto.goal || null;
    if (dto.startDate !== undefined) sprint.startDate = new Date(dto.startDate) as any;
    if (dto.endDate !== undefined) sprint.endDate = new Date(dto.endDate) as any;
    if (dto.status !== undefined) {
      this.validateStatusTransition(sprint.status, dto.status);
      sprint.status = dto.status;
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
    await this.getSprint(auth, workspaceId, sprintId);

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
