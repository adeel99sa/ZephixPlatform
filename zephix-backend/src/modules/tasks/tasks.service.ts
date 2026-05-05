import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ResourceCalculationService } from '../resources/services/resource-calculation.service';
import { KPIService } from '../kpi/kpi.service';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class TasksService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Task))
    private taskRepository: TenantAwareRepository<Task>,
    @Inject(getTenantAwareRepositoryToken(TaskDependency))
    private dependencyRepository: TenantAwareRepository<TaskDependency>,
    private resourceCalculationService: ResourceCalculationService,
    private kpiService: KPIService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    organizationId: string,
  ): Promise<Task> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    // Generate task number if not provided
    const taskNumber = createTaskDto.taskNumber || `TASK-${Date.now()}`;

    const task = this.taskRepository.create({
      ...createTaskDto,
      taskNumber,
      organizationId: orgId,
    });

    const savedTask = await this.taskRepository.save(task);

    // FIXME(task-entity-drift): resource impact calculation block is DEAD on three
    // separate axes as of 2026-05-05:
    //   1. POST /tasks endpoint (which reaches this method) is blocked with 410 Gone
    //      by LegacyTasksGuard (src/guards/legacy-tasks.guard.ts) — write paths return
    //      `LEGACY_ENDPOINT_DISABLED` before this code runs.
    //   2. `assignedResources` and `resourceImpactScore` columns were REMOVED from
    //      canonical Task entity (projects/entities/task.entity.ts) on 2026-05-05
    //      because they were declared in entity but never migrated to DB schema.
    //      Drift origin: dead `add-task-resource-fields.sql` migration file.
    //   3. The orphaned entity that this service still imports (tasks/entities/task.entity.ts)
    //      declares these columns, but the underlying DB columns do not exist, so the
    //      conditional `savedTask.assignedResources` was always falsy in practice.
    //
    // Block left in place but no-op'd to make the broken behavior explicit.
    //
    // Follow-up dispatches needed:
    //   - Orphaned entity deprecation (separate dispatch — CONSTRAINT 4 of this PR)
    //   - KPI/resource-impact metric correctness redesign
    //   - Decision on whether legacy /tasks API can be deleted entirely
    //
    // Tracked: docs/dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md
    return savedTask;
  }

  async findAll(projectId: string, organizationId: string): Promise<Task[]> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    return await this.taskRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      relations: ['assignee', 'phase'],
    });
  }

  async findOne(id: string, organizationId: string): Promise<Task> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'phase', 'project'],
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    organizationId: string,
  ): Promise<Task> {
    const task = await this.findOne(id, organizationId);

    // Update progress to 100 if status is done
    if (updateTaskDto.status === 'done') {
      updateTaskDto.progress = 100;
      // Don't set completedDate on the DTO, set it directly in the update
    }

    Object.assign(task, updateTaskDto);

    // Set completedDate separately if task is done
    if (updateTaskDto.status === 'done') {
      task.completedDate = new Date();
    }

    const updatedTask = await this.taskRepository.save(task);

    // FIXME(task-entity-drift): resource impact recalculation block is DEAD as of
    // 2026-05-05. Same reasons as `create()` above:
    //   1. PATCH /tasks/:id endpoint blocked with 410 Gone by LegacyTasksGuard
    //   2. `resource_impact_score`, `assigned_resources`, `start_date`, `end_date`
    //      columns REMOVED from canonical Task entity (drift never reached DB)
    //   3. DTO fields `assignedResources`/`startDate`/`endDate` may still arrive on
    //      the request body (DTO unchanged), but writes against canonical entity
    //      would no longer persist them; orphaned entity still declares them but
    //      DB columns don't exist anyway.
    //
    // Block left in place as no-op so future deletion is a clean diff after the
    // legacy /tasks API is removed (LegacyTasksGuard already returns 410 on writes).
    //
    // Follow-up dispatches needed:
    //   - Orphaned entity deprecation
    //   - DTO cleanup (remove drifted fields from create-task.dto.ts/update-task.dto.ts)
    //   - KPI/resource-impact redesign
    //
    // Tracked: docs/dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md

    // Trigger KPI recalculation for the project
    try {
      await this.kpiService.invalidateProjectCache(task.projectId);
    } catch (error) {
      console.warn(
        'Failed to invalidate KPI cache for project:',
        task.projectId,
        error,
      );
    }

    return updatedTask;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const task = await this.findOne(id, organizationId);
    await this.taskRepository.remove(task);
  }

  async getTasksWithDependencies(
    projectId: string,
    organizationId: string,
  ): Promise<Task[]> {
    const tasks = await this.findAll(projectId, organizationId);

    // Check for circular dependencies
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          if (!taskMap.has(depId)) {
            throw new BadRequestException(`Dependency ${depId} not found`);
          }
        }
      }
    }

    return tasks;
  }

  async updateProgress(
    id: string,
    progress: number,
    organizationId: string,
  ): Promise<Task> {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    return await this.update(id, { progress }, organizationId);
  }

  async findByAssignee(email: string, organizationId: string): Promise<Task[]> {
    // FIXME(task-entity-drift): assignedResources column was REMOVED from canonical
    // Task entity (src/modules/projects/entities/task.entity.ts) on 2026-05-05
    // because the column was declared in entity but never migrated to DB schema.
    // Drift origin: dead `add-task-resource-fields.sql` migration file that the
    // migration runner never loaded.
    //
    // Previous behavior: filtered tasks by `task.assignedResources.toLowerCase().includes(email)`.
    // The `assigned_resources` column does not exist in the `tasks` DB table, so any
    // SELECT against this entity that included the column would fail OR return undefined.
    // In practice this method has been silently broken (returning empty list or throwing).
    //
    // This endpoint (`GET /tasks/my-tasks`) is part of the legacy /tasks API that is
    // being deprecated (see LegacyTasksGuard at src/guards/legacy-tasks.guard.ts —
    // GET allowed for read-only backward compat, POST/PUT/PATCH/DELETE return 410 Gone).
    // Canonical task assignment lives in WorkTask entity (work_tasks table) via
    // `assignee_user_id` FK column, not a TEXT search field on tasks.
    //
    // Honest broken behavior: returns empty array. The endpoint never worked correctly
    // because the underlying schema field never existed. Any frontend depending on
    // GET /tasks/my-tasks has been seeing zero tasks regardless of actual assignments.
    //
    // Follow-up dispatch needed: replace this method or delete the legacy endpoint:
    //   1. Replace with proper assignment lookup via TaskAssignment join table, OR
    //   2. Migrate /tasks/my-tasks consumers to /api/work/tasks (canonical WorkTask path), OR
    //   3. Delete the method entirely if /tasks/my-tasks is no longer needed.
    //
    // Tracked: docs/dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md
    void email;
    void organizationId;
    return [];
  }

  async addDependency(
    successorId: string,
    predecessorId: string,
    organizationId: string,
  ) {
    // Verify both tasks exist and belong to the organization
    // TenantAwareRepository automatically scopes by organizationId
    const [successor, predecessor] = await Promise.all([
      this.taskRepository.findOne({
        where: { id: successorId },
      }),
      this.taskRepository.findOne({
        where: { id: predecessorId },
      }),
    ]);

    if (!successor || !predecessor) {
      throw new NotFoundException('One or both tasks not found');
    }

    // Check for circular dependencies
    if (await this.wouldCreateCycle(predecessorId, successorId)) {
      throw new BadRequestException('This would create a circular dependency');
    }

    // Create the dependency
    const dependency = await this.dependencyRepository.save({
      predecessorId,
      successorId,
      type: 'finish-to-start',
    });

    // Adjust dates if needed
    await this.adjustDatesForDependency(dependency);

    return dependency;
  }

  async removeDependency(
    taskId: string,
    dependencyId: string,
    organizationId: string,
  ) {
    // Verify the task exists and belongs to the organization
    // TenantAwareRepository automatically scopes by organizationId
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // TenantAwareRepository automatically scopes TaskDependency queries
    await this.dependencyRepository.delete({
      successorId: taskId,
      predecessorId: dependencyId,
    });

    return { success: true };
  }

  async getDependencies(taskId: string, organizationId: string) {
    // Verify the task exists and belongs to the organization
    // TenantAwareRepository automatically scopes by organizationId
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // TenantAwareRepository automatically scopes TaskDependency queries
    const dependencies = await this.dependencyRepository.find({
      where: { successorId: taskId },
      relations: ['predecessor'],
    });

    return dependencies.map((dep) => ({
      id: dep.id,
      predecessorId: dep.predecessorId,
      predecessorName: dep.predecessor?.name,
      type: dep.type,
    }));
  }

  private async wouldCreateCycle(
    fromId: string,
    toId: string,
  ): Promise<boolean> {
    // Simple cycle detection - check if toId can reach fromId
    const visited = new Set<string>();
    const queue = [toId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === fromId) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const dependencies = await this.dependencyRepository.find({
          where: { predecessorId: current },
        });
        queue.push(...dependencies.map((d) => d.successorId));
      }
    }

    return false;
  }

  private async adjustDatesForDependency(
    dependency: TaskDependency,
  ): Promise<void> {
    // FIXME(orphan-task-entity-drift): startDate/endDate columns were removed from
    // orphan Task entity because they were never migrated to DB schema. This method
    // adjusted task dependency dates, but the underlying columns never existed, so:
    //   - predecessor.endDate was always undefined (read returned undefined)
    //   - successor.startDate was always undefined (read returned undefined)
    //   - update({ startDate }) targeted a non-existent column (write blocked silently
    //     OR failed with QueryFailedError caught upstream)
    //
    // This method has been silently broken since orphan entity was created.
    //
    // This method is also part of legacy /tasks API blocked by LegacyTasksGuard 410
    // for write paths. Whether read paths reach this method is unclear without
    // endpoint audit.
    //
    // Follow-up dispatch needed: dependency date adjustment correctness — likely
    // needs migration to WorkTask + work_tasks table which has proper start_date/due_date
    // columns, OR removal if no longer needed in product direction.
    // Tracked: docs/dispatches/ORPHAN-TASK-ENTITY-DRIFT-REMOVAL-DISPATCH.md
    void dependency;
    return;
  }
}
