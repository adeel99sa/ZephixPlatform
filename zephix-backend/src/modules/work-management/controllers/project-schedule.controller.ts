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
  Headers,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CriticalPathEngineService } from '../services/critical-path-engine.service';
import { ScheduleRescheduleService } from '../services/schedule-reschedule.service';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateWorkspaceIdHeader(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id is required',
    });
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class ProjectScheduleController {
  private readonly logger = new Logger(ProjectScheduleController.name);

  constructor(
    private readonly criticalPathEngine: CriticalPathEngineService,
    private readonly rescheduleService: ScheduleRescheduleService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /** Workspace membership + project org/workspace alignment (Decision C: cross-org → 403). */
  private async assertScheduleProjectAccess(
    req: AuthRequest,
    workspaceIdHeader: string | undefined,
    projectId: string,
  ): Promise<void> {
    const workspaceId = validateWorkspaceIdHeader(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    const proj = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'workspaceId'],
    });
    if (!proj) {
      throw new NotFoundException('Project not found');
    }
    if (proj.organizationId !== auth.organizationId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }
    if (proj.workspaceId !== workspaceId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }
  }

  @Get(':projectId/schedule')
  async getSchedule(
    @Param('projectId') projectId: string,
    @Query('mode') mode: string = 'planned',
    @Query('includeCritical') includeCritical: string = 'false',
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.assertScheduleProjectAccess(req, workspaceIdHeader, projectId);

    const { organizationId } = req.user;
    const workspaceId = validateWorkspaceIdHeader(workspaceIdHeader);

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
          assigneeUserId: t.assigneeUserId,
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
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
  ) {
    await this.assertScheduleProjectAccess(req, workspaceIdHeader, projectId);

    const { organizationId } = req.user;
    const workspaceId = validateWorkspaceIdHeader(workspaceIdHeader);

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
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
  ) {
    await this.assertScheduleProjectAccess(req, workspaceIdHeader, projectId);

    const { organizationId } = req.user;
    const workspaceId = validateWorkspaceIdHeader(workspaceIdHeader);

    const result = await this.rescheduleService.applyGanttDrag({
      organizationId,
      workspaceId,
      taskId,
      ...body,
    });

    return { success: true, data: result };
  }
}
