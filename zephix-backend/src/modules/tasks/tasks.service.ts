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

    // Calculate resource impact if task has required fields
    if (savedTask.estimatedHours && savedTask.assignedResources) {
      try {
        const impactScore =
          await this.resourceCalculationService.calculateResourceImpact(
            savedTask.id,
          );
        await this.taskRepository.update(savedTask.id, {
          resourceImpactScore: impactScore,
        });
        savedTask.resourceImpactScore = impactScore;
      } catch (error) {
        console.warn(
          'Failed to calculate resource impact for task:',
          savedTask.id,
          error,
        );
      }
    }

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

    // Recalculate resource impact if relevant fields changed
    if (
      updateTaskDto.estimatedHours ||
      updateTaskDto.assignedResources ||
      updateTaskDto.startDate ||
      updateTaskDto.endDate
    ) {
      try {
        const impactScore =
          await this.resourceCalculationService.calculateResourceImpact(id);
        await this.taskRepository.update(id, {
          resourceImpactScore: impactScore,
        });
        updatedTask.resourceImpactScore = impactScore;
      } catch (error) {
        console.warn(
          'Failed to recalculate resource impact for task:',
          id,
          error,
        );
      }
    }

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
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId
    const tasks = await this.taskRepository.find({
      where: {},
      relations: ['project', 'assignee', 'phase'],
    });

    // Filter tasks that include this user in assignedResources
    return tasks.filter(
      (task) =>
        task.assignedResources &&
        task.assignedResources.toLowerCase().includes(email.toLowerCase()),
    );
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
    // TenantAwareRepository automatically scopes by organizationId
    const [predecessor, successor] = await Promise.all([
      this.taskRepository.findOne({ where: { id: dependency.predecessorId } }),
      this.taskRepository.findOne({ where: { id: dependency.successorId } }),
    ]);

    if (predecessor?.endDate && successor?.startDate) {
      const predecessorEnd = new Date(predecessor.endDate);
      const successorStart = new Date(successor.startDate);

      if (successorStart < predecessorEnd) {
        // Shift successor to start after predecessor ends
        const dayAfterPredecessor = new Date(predecessorEnd);
        dayAfterPredecessor.setDate(dayAfterPredecessor.getDate() + 1);

        await this.taskRepository.update(successor.id, {
          startDate: dayAfterPredecessor,
        });
      }
    }
  }
}
