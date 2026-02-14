/**
 * Phase 2C: Schedule integrity analysis endpoint.
 * Read-only. Reuses CPM graph builder. Does not persist.
 */
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CriticalPathEngineService } from '../services/critical-path-engine.service';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class ScheduleIntegrityController {
  constructor(
    private readonly criticalPathEngine: CriticalPathEngineService,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
  ) {}

  @Get(':projectId/schedule-integrity')
  async getScheduleIntegrity(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const { organizationId } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    // Load tasks
    const tasks = await this.taskRepo.find({
      where: { projectId, organizationId, deletedAt: null as any },
    });
    const taskIds = new Set(tasks.map((t) => t.id));

    // Load dependencies
    const deps = await this.depRepo.find({
      where: { projectId, organizationId },
    });

    // Cycle detection via CPM graph builder
    const cpResult = this.criticalPathEngine.computeFromData(
      tasks, deps.map((d) => ({
        predecessorTaskId: d.predecessorTaskId,
        successorTaskId: d.successorTaskId,
        type: d.type,
        lagMinutes: d.lagMinutes,
      })),
      'planned',
    );
    const hasCycles = cpResult.errors.some((e) => e.toLowerCase().includes('cycle'));

    // Orphan tasks: tasks with no dependencies (no predecessors, no successors)
    const hasSuccessor = new Set<string>();
    const hasPredecessor = new Set<string>();
    for (const d of deps) {
      if (taskIds.has(d.predecessorTaskId)) hasSuccessor.add(d.predecessorTaskId);
      if (taskIds.has(d.successorTaskId)) hasPredecessor.add(d.successorTaskId);
    }
    let orphanTasks = 0;
    for (const t of tasks) {
      if (!hasSuccessor.has(t.id) && !hasPredecessor.has(t.id)) {
        orphanTasks++;
      }
    }

    // Invalid dependencies: reference non-existent tasks
    let invalidDependencies = 0;
    for (const d of deps) {
      if (!taskIds.has(d.predecessorTaskId) || !taskIds.has(d.successorTaskId)) {
        invalidDependencies++;
      }
    }

    // Missing planned dates
    let missingDates = 0;
    for (const t of tasks) {
      if (!t.plannedStartAt || !t.plannedEndAt) {
        missingDates++;
      }
    }

    return {
      success: true,
      data: {
        hasCycles,
        orphanTasks,
        invalidDependencies,
        missingDates,
      },
    };
  }
}
