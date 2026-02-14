import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Req,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { IterationsService } from '../services/iterations.service';
import { CreateIterationDto, UpdateIterationDto } from '../dto/iteration.dto';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

/**
 * Iterations (sprints) for work management.
 *
 * Routes follow the frontend's existing sprints.api.ts contract:
 *   POST   /work/projects/:projectId/sprints
 *   GET    /work/projects/:projectId/sprints
 *   GET    /work/sprints/:sprintId
 *   PATCH  /work/sprints/:sprintId
 *   POST   /work/sprints/:sprintId/start
 *   POST   /work/sprints/:sprintId/complete
 *   POST   /work/sprints/:sprintId/cancel
 *   POST   /work/sprints/:sprintId/tasks/:taskId
 *   DELETE /work/sprints/:sprintId/tasks/:taskId
 *   POST   /work/sprints/:sprintId/tasks/:taskId/commit
 *   POST   /work/sprints/:sprintId/tasks/:taskId/uncommit
 *   GET    /work/sprints/:sprintId/metrics
 *   GET    /work/sprints/:sprintId/burndown?unit=points|hours
 *   GET    /work/sprints/:sprintId/capacity
 *   GET    /work/projects/:projectId/velocity?lookback=N
 */
@Controller('work')
@ApiTags('Iterations / Sprints')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IterationsController {
  constructor(
    private readonly iterationsService: IterationsService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  // ── Project-scoped routes (/work/projects/:projectId/...) ────────────

  @Post('projects/:projectId/sprints')
  @ApiOperation({ summary: 'Create a new iteration (sprint)' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async createIteration(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceId: string,
    @Body() dto: CreateIterationDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    const iteration = await this.iterationsService.create(
      organizationId,
      wsId,
      projectId,
      dto,
    );
    return this.responseService.success(iteration, 'Iteration created');
  }

  @Get('projects/:projectId/sprints')
  @ApiOperation({ summary: 'List iterations for a project' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async listIterations(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);

    const iterations = await this.iterationsService.list(
      organizationId,
      projectId,
    );
    return this.responseService.success(iterations);
  }

  @Get('projects/:projectId/velocity')
  @ApiOperation({ summary: 'Get velocity for a project' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiQuery({ name: 'lookback', required: false, type: Number })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getVelocity(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceId: string,
    @Query('lookback') lookback?: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);

    const n = lookback ? parseInt(lookback, 10) : 3;
    const result = await this.iterationsService.velocity(
      organizationId,
      projectId,
      n,
    );
    return this.responseService.success(result);
  }

  // ── Sprint-scoped routes (/work/sprints/:sprintId/...) ───────────────

  @Get('sprints/:sprintId')
  @ApiOperation({ summary: 'Get a single iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getIteration(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);

    const iteration = await this.iterationsService.findOne(
      organizationId,
      sprintId,
    );
    return this.responseService.success(iteration);
  }

  @Patch('sprints/:sprintId')
  @ApiOperation({ summary: 'Update an iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async updateIteration(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
    @Body() dto: UpdateIterationDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    const iteration = await this.iterationsService.update(
      organizationId,
      sprintId,
      dto,
    );
    return this.responseService.success(iteration, 'Iteration updated');
  }

  @Post('sprints/:sprintId/start')
  @ApiOperation({ summary: 'Start an iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async startIteration(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    const iteration = await this.iterationsService.start(
      organizationId,
      sprintId,
    );
    return this.responseService.success(iteration, 'Iteration started');
  }

  @Post('sprints/:sprintId/complete')
  @ApiOperation({ summary: 'Complete an iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async completeIteration(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    const iteration = await this.iterationsService.complete(
      organizationId,
      sprintId,
    );
    return this.responseService.success(iteration, 'Iteration completed');
  }

  @Post('sprints/:sprintId/cancel')
  @ApiOperation({ summary: 'Cancel an iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async cancelIteration(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    const iteration = await this.iterationsService.cancel(
      organizationId,
      sprintId,
    );
    return this.responseService.success(iteration, 'Iteration cancelled');
  }

  // ── Task assignment ──────────────────────────────────────────────────

  @Post('sprints/:sprintId/tasks/:taskId')
  @ApiOperation({ summary: 'Add a task to an iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async addTask(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    await this.iterationsService.addTask(organizationId, sprintId, taskId);
    return this.responseService.success(null, 'Task added to iteration');
  }

  @Delete('sprints/:sprintId/tasks/:taskId')
  @ApiOperation({ summary: 'Remove a task from an iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async removeTask(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    await this.iterationsService.removeTask(organizationId, sprintId, taskId);
    return this.responseService.success(null, 'Task removed from iteration');
  }

  @Post('sprints/:sprintId/tasks/:taskId/commit')
  @ApiOperation({ summary: 'Commit a task to the iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async commitTask(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    await this.iterationsService.commitTask(organizationId, sprintId, taskId);
    return this.responseService.success(null, 'Task committed');
  }

  @Post('sprints/:sprintId/tasks/:taskId/uncommit')
  @ApiOperation({ summary: 'Uncommit a task from the iteration' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async uncommitTask(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(wsId, userId);

    await this.iterationsService.uncommitTask(
      organizationId,
      sprintId,
      taskId,
    );
    return this.responseService.success(null, 'Task uncommitted');
  }

  // ── Metrics & Charts ─────────────────────────────────────────────────

  @Get('sprints/:sprintId/metrics')
  @ApiOperation({ summary: 'Get iteration metrics (points + hours)' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getMetrics(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);

    const metrics = await this.iterationsService.computeMetrics(
      organizationId,
      sprintId,
    );
    return this.responseService.success(metrics);
  }

  @Get('sprints/:sprintId/burndown')
  @ApiOperation({ summary: 'Burndown chart data (daily remaining)' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiQuery({ name: 'unit', required: false, enum: ['points', 'hours'] })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getBurndown(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
    @Query('unit') unit?: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);

    const burnUnit = unit === 'hours' ? 'hours' : 'points';
    const data = await this.iterationsService.burndown(
      organizationId,
      sprintId,
      burnUnit,
    );
    return this.responseService.success(data);
  }

  @Get('sprints/:sprintId/capacity')
  @ApiOperation({ summary: 'Get iteration capacity summary' })
  @ApiParam({ name: 'sprintId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getCapacity(
    @Req() req: AuthRequest,
    @Param('sprintId') sprintId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId } = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);

    // M4 Fix: computeMetrics() already fetches the iteration internally,
    // so we don't need a separate findOne() call (eliminates redundant DB round-trip)
    const metrics = await this.iterationsService.computeMetrics(
      organizationId,
      sprintId,
    );

    return this.responseService.success({
      sprintId,
      committedPoints: metrics.committedPoints,
      completedPoints: metrics.completedPoints,
      remainingPoints: metrics.committedPoints - metrics.completedPoints,
      committedHours: metrics.committedHours,
      actualHours: metrics.actualHours,
      remainingHours: metrics.remainingHours,
      capacityHours: metrics.capacityHours,
      taskCount: metrics.taskCount,
      doneTaskCount: metrics.completedTaskCount,
      basis: metrics.capacityHours ? 'manual' : 'computed',
    });
  }
}
