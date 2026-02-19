import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { Iteration, IterationStatus } from '../entities/iteration.entity';
import { WorkTask } from '../entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';
import { CreateIterationDto, UpdateIterationDto } from '../dto/iteration.dto';

export interface IterationMetrics {
  iterationId: string;
  plannedPoints: number;
  committedPoints: number;
  completedPoints: number;
  plannedHours: number;
  committedHours: number;
  actualHours: number;
  remainingHours: number;
  capacityHours: number | null;
  taskCount: number;
  committedTaskCount: number;
  completedTaskCount: number;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export interface VelocityEntry {
  iterationId: string;
  name: string;
  completedPoints: number;
  actualHours: number;
}

@Injectable()
export class IterationsService {
  private readonly logger = new Logger(IterationsService.name);

  constructor(
    @InjectRepository(Iteration)
    private iterationRepo: Repository<Iteration>,
    @InjectRepository(WorkTask)
    private workTaskRepo: Repository<WorkTask>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  /**
   * Enforces that iterations are enabled for the project.
   * Throws BadRequestException if iterationsEnabled is false.
   * Checks methodology_config.sprint.enabled first, falls back to iterationsEnabled flag.
   */
  private async assertIterationsEnabled(
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId },
      select: ['id', 'iterationsEnabled', 'methodologyConfig'],
    });
    if (!project) return;

    const config = project.methodologyConfig as any;
    const sprintEnabled = config?.sprint?.enabled ?? project.iterationsEnabled;

    if (!sprintEnabled) {
      throw new BadRequestException({
        code: 'ITERATIONS_DISABLED',
        message:
          'Sprints are not enabled for this project methodology. Update the methodology configuration to enable iterations.',
      });
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  async create(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    dto: CreateIterationDto,
  ): Promise<Iteration> {
    await this.assertIterationsEnabled(organizationId, projectId);

    const iteration = this.iterationRepo.create({
      organizationId,
      workspaceId,
      projectId,
      name: dto.name,
      goal: dto.goal || null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      capacityHours: dto.capacityHours ?? null,
      status: IterationStatus.PLANNING,
    });
    return this.iterationRepo.save(iteration);
  }

  async list(
    organizationId: string,
    projectId: string,
  ): Promise<Iteration[]> {
    return this.iterationRepo.find({
      where: { organizationId, projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    organizationId: string,
    iterationId: string,
  ): Promise<Iteration> {
    const iteration = await this.iterationRepo.findOne({
      where: { id: iterationId, organizationId },
    });
    if (!iteration) throw new NotFoundException('Iteration not found');
    return iteration;
  }

  async update(
    organizationId: string,
    iterationId: string,
    dto: UpdateIterationDto,
  ): Promise<Iteration> {
    const iteration = await this.findOne(organizationId, iterationId);

    if (dto.name !== undefined) iteration.name = dto.name;
    if (dto.goal !== undefined) iteration.goal = dto.goal || null;
    if (dto.startDate !== undefined)
      iteration.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      iteration.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.capacityHours !== undefined)
      iteration.capacityHours = dto.capacityHours ?? null;

    return this.iterationRepo.save(iteration);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  async start(
    organizationId: string,
    iterationId: string,
  ): Promise<Iteration> {
    const iteration = await this.findOne(organizationId, iterationId);
    await this.assertIterationsEnabled(organizationId, iteration.projectId);
    if (iteration.status !== IterationStatus.PLANNING) {
      throw new BadRequestException(
        `Cannot start iteration in status ${iteration.status}`,
      );
    }

    // Default remainingHours for committed tasks that don't have it set
    await this.workTaskRepo
      .createQueryBuilder()
      .update(WorkTask)
      .set({ remainingHours: () => '"estimate_hours"' })
      .where(
        '"iteration_id" = :id AND "committed" = true AND "remaining_hours" IS NULL AND "estimate_hours" IS NOT NULL',
        { id: iterationId },
      )
      .execute();

    iteration.status = IterationStatus.ACTIVE;
    iteration.startedAt = new Date();

    // Snapshot planned/committed aggregates
    const metrics = await this.computeMetrics(organizationId, iterationId);
    iteration.plannedPoints = metrics.plannedPoints;
    iteration.committedPoints = metrics.committedPoints;
    iteration.committedHours = metrics.committedHours;

    return this.iterationRepo.save(iteration);
  }

  async complete(
    organizationId: string,
    iterationId: string,
  ): Promise<Iteration> {
    const iteration = await this.findOne(organizationId, iterationId);
    await this.assertIterationsEnabled(organizationId, iteration.projectId);
    if (iteration.status !== IterationStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot complete iteration in status ${iteration.status}`,
      );
    }

    const metrics = await this.computeMetrics(organizationId, iterationId);
    iteration.status = IterationStatus.COMPLETED;
    iteration.completedAt = new Date();
    iteration.completedPoints = metrics.completedPoints;
    iteration.completedHours = metrics.actualHours;

    return this.iterationRepo.save(iteration);
  }

  async cancel(
    organizationId: string,
    iterationId: string,
  ): Promise<Iteration> {
    const iteration = await this.findOne(organizationId, iterationId);
    await this.assertIterationsEnabled(organizationId, iteration.projectId);
    if (iteration.status === IterationStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed iteration');
    }
    iteration.status = IterationStatus.CANCELLED;
    return this.iterationRepo.save(iteration);
  }

  // ── Task assignment ──────────────────────────────────────────────────

  async addTask(
    organizationId: string,
    iterationId: string,
    taskId: string,
  ): Promise<void> {
    const iteration = await this.findOne(organizationId, iterationId);
    await this.assertIterationsEnabled(organizationId, iteration.projectId);
    await this.workTaskRepo.update(
      { id: taskId, organizationId },
      { iterationId },
    );
  }

  async removeTask(
    organizationId: string,
    iterationId: string,
    taskId: string,
  ): Promise<void> {
    await this.workTaskRepo.update(
      { id: taskId, organizationId, iterationId },
      { iterationId: null, committed: false },
    );
  }

  async commitTask(
    organizationId: string,
    iterationId: string,
    taskId: string,
  ): Promise<void> {
    await this.workTaskRepo.update(
      { id: taskId, organizationId, iterationId },
      { committed: true },
    );
  }

  async uncommitTask(
    organizationId: string,
    iterationId: string,
    taskId: string,
  ): Promise<void> {
    await this.workTaskRepo.update(
      { id: taskId, organizationId, iterationId },
      { committed: false },
    );
  }

  // ── Metrics ──────────────────────────────────────────────────────────

  async computeMetrics(
    organizationId: string,
    iterationId: string,
  ): Promise<IterationMetrics> {
    const rows = await this.workTaskRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(*)::int AS "taskCount"',
        'COUNT(*) FILTER (WHERE t.committed = true)::int AS "committedTaskCount"',
        'COUNT(*) FILTER (WHERE t.completed_at IS NOT NULL)::int AS "completedTaskCount"',
        'COALESCE(SUM(t.estimate_points), 0)::int AS "plannedPoints"',
        'COALESCE(SUM(t.estimate_points) FILTER (WHERE t.committed = true), 0)::int AS "committedPoints"',
        'COALESCE(SUM(t.estimate_points) FILTER (WHERE t.completed_at IS NOT NULL), 0)::int AS "completedPoints"',
        'COALESCE(SUM(t.estimate_hours), 0)::numeric AS "plannedHours"',
        'COALESCE(SUM(t.estimate_hours) FILTER (WHERE t.committed = true), 0)::numeric AS "committedHours"',
        'COALESCE(SUM(t.actual_hours), 0)::numeric AS "actualHours"',
        'COALESCE(SUM(t.remaining_hours), 0)::numeric AS "remainingHours"',
      ])
      .where('t.iteration_id = :iterationId', { iterationId })
      .andWhere('t.organization_id = :organizationId', { organizationId })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    const iteration = await this.findOne(organizationId, iterationId);

    return {
      iterationId,
      plannedPoints: Number(rows.plannedPoints),
      committedPoints: Number(rows.committedPoints),
      completedPoints: Number(rows.completedPoints),
      plannedHours: Number(rows.plannedHours),
      committedHours: Number(rows.committedHours),
      actualHours: Number(rows.actualHours),
      remainingHours: Number(rows.remainingHours),
      capacityHours: iteration.capacityHours
        ? Number(iteration.capacityHours)
        : null,
      taskCount: Number(rows.taskCount),
      committedTaskCount: Number(rows.committedTaskCount),
      completedTaskCount: Number(rows.completedTaskCount),
    };
  }

  // ── Burndown / Burnup ────────────────────────────────────────────────

  async burndown(
    organizationId: string,
    iterationId: string,
    unit: 'points' | 'hours',
  ): Promise<BurndownPoint[]> {
    const iteration = await this.findOne(organizationId, iterationId);
    if (!iteration.startDate || !iteration.endDate) {
      throw new BadRequestException(
        'Iteration must have start and end dates for burndown',
      );
    }

    const start = new Date(iteration.startDate);
    const end = new Date(iteration.endDate);
    const today = new Date();
    const effectiveEnd = end < today ? end : today;

    // Get total scope at start
    const totalQuery = await this.workTaskRepo
      .createQueryBuilder('t')
      .select(
        unit === 'points'
          ? 'COALESCE(SUM(t.estimate_points), 0)::int AS total'
          : 'COALESCE(SUM(COALESCE(t.remaining_hours, t.estimate_hours)), 0)::numeric AS total',
      )
      .where('t.iteration_id = :iterationId', { iterationId })
      .andWhere('t.organization_id = :organizationId', { organizationId })
      .andWhere('t.committed = true')
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    const totalScope = Number(totalQuery.total);

    // Get completions by day
    const completions = await this.workTaskRepo
      .createQueryBuilder('t')
      .select([
        't.completed_at::date AS "completedDate"',
        unit === 'points'
          ? 'COALESCE(SUM(t.estimate_points), 0)::int AS "completedValue"'
          : 'COALESCE(SUM(COALESCE(t.remaining_hours, t.estimate_hours)), 0)::numeric AS "completedValue"',
      ])
      .where('t.iteration_id = :iterationId', { iterationId })
      .andWhere('t.organization_id = :organizationId', { organizationId })
      .andWhere('t.committed = true')
      .andWhere('t.completed_at IS NOT NULL')
      .andWhere('t.deleted_at IS NULL')
      .groupBy('t.completed_at::date')
      .orderBy('t.completed_at::date', 'ASC')
      .getRawMany();

    // Build daily series
    const completionMap = new Map<string, number>();
    for (const row of completions) {
      const dateStr = new Date(row.completedDate).toISOString().split('T')[0];
      completionMap.set(dateStr, Number(row.completedValue));
    }

    const series: BurndownPoint[] = [];
    let remaining = totalScope;
    const cursor = new Date(start);

    while (cursor <= effectiveEnd) {
      const dateStr = cursor.toISOString().split('T')[0];
      const completedToday = completionMap.get(dateStr) || 0;
      remaining -= completedToday;
      series.push({ date: dateStr, remaining: Math.max(0, remaining) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return series;
  }

  // ── Velocity ─────────────────────────────────────────────────────────

  async velocity(
    organizationId: string,
    projectId: string,
    lookback: number = 3,
  ): Promise<{ iterations: VelocityEntry[]; rollingAveragePoints: number; rollingAverageHours: number }> {
    const completed = await this.iterationRepo.find({
      where: {
        organizationId,
        projectId,
        status: IterationStatus.COMPLETED,
      },
      order: { completedAt: 'DESC' },
      take: lookback,
    });

    const entries: VelocityEntry[] = completed.map((it) => ({
      iterationId: it.id,
      name: it.name,
      completedPoints: it.completedPoints ? Number(it.completedPoints) : 0,
      actualHours: it.completedHours ? Number(it.completedHours) : 0,
    }));

    const count = entries.length || 1;
    const rollingAveragePoints =
      entries.reduce((s, e) => s + e.completedPoints, 0) / count;
    const rollingAverageHours =
      entries.reduce((s, e) => s + e.actualHours, 0) / count;

    return { iterations: entries, rollingAveragePoints, rollingAverageHours };
  }
}
