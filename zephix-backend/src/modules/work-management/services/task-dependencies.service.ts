import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantAwareRepository, getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { AddDependencyDto, RemoveDependencyDto } from '../dto';
import { DependencyType } from '../enums/task.enums';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { In } from 'typeorm';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class TaskDependenciesService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTaskDependency))
    private readonly dependencyRepo: TenantAwareRepository<WorkTaskDependency>,
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    private readonly activityService: TaskActivityService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async addDependency(
    auth: AuthContext,
    workspaceId: string,
    successorTaskId: string,
    dto: AddDependencyDto,
  ): Promise<WorkTaskDependency> {
    const organizationId = this.tenantContext.assertOrganizationId();
    const { predecessorTaskId, type = DependencyType.FINISH_TO_START } = dto;

    // Reject self-dependency
    if (predecessorTaskId === successorTaskId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Task cannot depend on itself',
      });
    }

    // Validate both tasks exist in same org and workspace
    const [predecessor, successor] = await Promise.all([
      this.taskRepo.findOne({
        where: { id: predecessorTaskId, workspaceId },
      }),
      this.taskRepo.findOne({
        where: { id: successorTaskId, workspaceId },
      }),
    ]);

    if (!predecessor || !successor) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'One or more tasks not found',
      });
    }

    // Check for duplicate
    const existing = await this.dependencyRepo.findOne({
      where: {
        workspaceId,
        predecessorTaskId,
        successorTaskId,
        type,
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Dependency already exists',
      });
    }

    // Cycle detection: Check if successor can already reach predecessor
    // If adding predecessor -> successor, and successor can reach predecessor, that's a cycle
    const wouldCreateCycle = await this.wouldCreateCycle(
      workspaceId,
      successorTaskId,
      predecessorTaskId,
    );

    if (wouldCreateCycle) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Dependency cycle detected',
      });
    }

    // Create dependency
    const dependency = this.dependencyRepo.create({
      organizationId,
      workspaceId,
      projectId: successor.projectId,
      predecessorTaskId,
      successorTaskId,
      type,
      createdByUserId: auth.userId,
    });

    const saved = await this.dependencyRepo.save(dependency);

    // Emit activity
    await this.activityService.record(
      auth,
      workspaceId,
      successorTaskId,
      'DEPENDENCY_ADDED' as any,
      {
        predecessorTaskId,
        type,
        dependencyId: saved.id,
      },
    );

    return saved;
  }

  async listDependencies(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
  ): Promise<{
    predecessors: WorkTaskDependency[];
    successors: WorkTaskDependency[];
  }> {
    const [predecessors, successors] = await Promise.all([
      this.dependencyRepo.find({
        where: { successorTaskId: taskId, workspaceId },
        relations: ['predecessorTask'],
      }),
      this.dependencyRepo.find({
        where: { predecessorTaskId: taskId, workspaceId },
        relations: ['successorTask'],
      }),
    ]);

    return { predecessors, successors };
  }

  async removeDependency(
    auth: AuthContext,
    workspaceId: string,
    successorTaskId: string,
    dto: RemoveDependencyDto,
  ): Promise<void> {
    const { predecessorTaskId, type } = dto;

    const dependency = await this.dependencyRepo.findOne({
      where: {
        workspaceId,
        predecessorTaskId,
        successorTaskId,
        ...(type ? { type } : {}),
      },
    });

    if (!dependency) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Dependency not found',
      });
    }

    await this.dependencyRepo.remove(dependency);

    // Emit activity
    await this.activityService.record(
      auth,
      workspaceId,
      successorTaskId,
      'DEPENDENCY_REMOVED' as any,
      {
        predecessorTaskId,
        type: dependency.type,
      },
    );
  }

  /**
   * Check if adding edge predecessor -> successor would create a cycle
   * Uses BFS to check if successor can already reach predecessor
   * 
   * If we're adding P->S, and S can already reach P through existing dependencies,
   * then adding P->S creates a cycle.
   * 
   * To check if S can reach P:
   * - Start from S
   * - Follow dependencies where S is predecessor (S->X means X depends on S)
   * - If we can reach P, cycle exists
   */
  private async wouldCreateCycle(
    workspaceId: string,
    startTaskId: string, // Start BFS from here (successor)
    targetTaskId: string, // Try to reach this (predecessor)
  ): Promise<boolean> {
    // If startTaskId can reach targetTaskId, adding targetTaskId -> startTaskId creates a cycle
    const visited = new Set<string>();
    const queue: string[] = [startTaskId];
    const maxDepth = 1000;
    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      const currentLevelSize = queue.length;
      depth++;

      for (let i = 0; i < currentLevelSize; i++) {
        const current = queue.shift()!;

        if (visited.has(current)) {
          continue;
        }

        visited.add(current);

        // If we reached target, cycle exists
        if (current === targetTaskId) {
          return true;
        }

        // Get all tasks that depend on current (successors of current)
        // Dependencies where current is the predecessor
        // current->X means X depends on current, so from current we can reach X
        const dependencies = await this.dependencyRepo.find({
          where: {
            workspaceId,
            predecessorTaskId: current,
          },
          select: ['successorTaskId'],
        });

        // Add all successors to queue
        for (const dep of dependencies) {
          if (!visited.has(dep.successorTaskId)) {
            queue.push(dep.successorTaskId);
          }
        }
      }
    }

    return false;
  }
}

