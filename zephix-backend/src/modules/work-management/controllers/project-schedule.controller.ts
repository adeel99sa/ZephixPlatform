import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CriticalPathEngineService } from '../services/critical-path-engine.service';
import { ScheduleRescheduleService } from '../services/schedule-reschedule.service';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class ProjectScheduleController {
  private readonly logger = new Logger(ProjectScheduleController.name);

  constructor(
    private readonly criticalPathEngine: CriticalPathEngineService,
    private readonly rescheduleService: ScheduleRescheduleService,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
  ) {}

  @Get(':projectId/schedule')
  async getSchedule(
    @Param('projectId') projectId: string,
    @Query('mode') mode: string = 'planned',
    @Query('includeCritical') includeCritical: string = 'false',
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { organizationId } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    const tasks = await this.taskRepo.find({
      where: { projectId, organizationId, deletedAt: null as any },
      order: { rank: 'ASC' },
    });

    // Large project warning
    if (tasks.length > 5000) {
      res.setHeader('X-Zephix-Schedule-Warning', 'Large project graph');
    }

    const deps = await this.depRepo.find({ where: { projectId, organizationId } });

    let criticalInfo: any = null;
    if (includeCritical === 'true') {
      criticalInfo = await this.criticalPathEngine.compute({
        organizationId,
        workspaceId,
        projectId,
        scheduleMode: mode === 'actual' ? 'actual' : 'planned',
      });
    }

    return {
      success: true,
      data: {
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          phaseId: t.phaseId,
          status: t.status,
          startDate: t.startDate,
          dueDate: t.dueDate,
          plannedStartAt: t.plannedStartAt,
          plannedEndAt: t.plannedEndAt,
          actualStartAt: t.actualStartAt,
          actualEndAt: t.actualEndAt,
          percentComplete: t.percentComplete,
          isMilestone: t.isMilestone,
          constraintType: t.constraintType,
          wbsCode: t.wbsCode,
          isCritical: criticalInfo?.nodes.get(t.id)?.isCritical ?? null,
          totalFloatMinutes: criticalInfo?.nodes.get(t.id)?.totalFloatMinutes ?? null,
        })),
        dependencies: deps.map((d) => ({
          id: d.id,
          predecessorTaskId: d.predecessorTaskId,
          successorTaskId: d.successorTaskId,
          type: d.type,
          lagMinutes: d.lagMinutes,
        })),
        criticalPathTaskIds: criticalInfo?.criticalPathTaskIds ?? [],
        projectFinishMinutes: criticalInfo?.projectFinishMinutes ?? null,
      },
    };
  }

  @Get(':projectId/critical-path')
  async getCriticalPath(
    @Param('projectId') projectId: string,
    @Query('mode') mode: string = 'planned',
    @Req() req: any,
  ) {
    const { organizationId } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    const result = await this.criticalPathEngine.compute({
      organizationId,
      workspaceId,
      projectId,
      scheduleMode: mode === 'actual' ? 'actual' : 'planned',
    });

    if (result.errors.length > 0) {
      return { success: false, errors: result.errors };
    }

    const nodesArray = Array.from(result.nodes.values()).map((n) => ({
      taskId: n.taskId,
      earlyStart: n.es,
      earlyFinish: n.ef,
      lateStart: n.ls,
      lateFinish: n.lf,
      totalFloatMinutes: n.totalFloatMinutes,
      isCritical: n.isCritical,
      durationMinutes: n.durationMinutes,
    }));

    return {
      success: true,
      data: {
        nodes: nodesArray,
        criticalPathTaskIds: result.criticalPathTaskIds,
        projectFinishMinutes: result.projectFinishMinutes,
        longestPathDurationMinutes: result.longestPathDurationMinutes,
      },
    };
  }

  @Patch(':projectId/tasks/:taskId/schedule')
  async patchTaskSchedule(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body()
    body: {
      plannedStartAt?: string;
      plannedEndAt?: string;
      percentComplete?: number;
      isMilestone?: boolean;
      constraintType?: string;
      constraintDate?: string;
      cascade?: 'none' | 'forward';
    },
    @Req() req: any,
  ) {
    const { organizationId } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    const result = await this.rescheduleService.applyGanttDrag({
      organizationId,
      workspaceId,
      taskId,
      ...body,
    });

    return { success: true, data: result };
  }
}
