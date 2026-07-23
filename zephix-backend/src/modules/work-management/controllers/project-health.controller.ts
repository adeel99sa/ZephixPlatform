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
import { Repository, IsNull } from 'typeorm';

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
        where: { projectId, organizationId, deletedAt: IsNull() },
      }),
      this.depRepo.count({ where: { projectId, organizationId } }),
      this.taskRepo.count({
        where: { projectId, organizationId, isMilestone: true, deletedAt: IsNull() },
      }),
      // SEC-XORG-READ-1 (R4): these three counts leaked cross-org existence
      // (a foreign projectId returned real magnitudes). Now org-scoped, so a
      // cross-org or unknown projectId both return 0 — the response is
      // indistinguishable, matching the already-scoped task counts above.
      this.baselineRepo.count({ where: { projectId, organizationId } }),
      this.snapshotRepo.count({ where: { projectId, organizationId } }),
      this.iterationRepo.count({ where: { projectId, organizationId } }),
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
