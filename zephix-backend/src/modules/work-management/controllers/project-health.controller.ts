/**
 * Phase 2C: Project size metrics endpoint.
 * Read-only diagnostic endpoint — no mutations.
 */
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { ScheduleBaseline } from '../entities/schedule-baseline.entity';
import { EarnedValueSnapshot } from '../entities/earned-value-snapshot.entity';
import { Iteration } from '../entities/iteration.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class ProjectHealthController {
  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
    @InjectRepository(ScheduleBaseline)
    private readonly baselineRepo: Repository<ScheduleBaseline>,
    @InjectRepository(EarnedValueSnapshot)
    private readonly snapshotRepo: Repository<EarnedValueSnapshot>,
    @InjectRepository(Iteration)
    private readonly iterationRepo: Repository<Iteration>,
  ) {}

  @Get(':projectId/health')
  async getProjectHealth(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const { organizationId } = req.user;

    const [
      taskCount,
      dependencyCount,
      milestoneCount,
      baselineCount,
      earnedValueSnapshots,
      iterationCount,
    ] = await Promise.all([
      this.taskRepo.count({
        where: { projectId, organizationId, deletedAt: null as any },
      }),
      this.depRepo.count({ where: { projectId, organizationId } }),
      this.taskRepo.count({
        where: { projectId, organizationId, isMilestone: true, deletedAt: null as any },
      }),
      this.baselineRepo.count({ where: { projectId } }),
      this.snapshotRepo.count({ where: { projectId } }),
      this.iterationRepo.count({ where: { projectId } }),
    ]);

    return {
      success: true,
      data: {
        taskCount,
        dependencyCount,
        milestoneCount,
        baselineCount,
        earnedValueSnapshots,
        iterationCount,
      },
    };
  }
}
