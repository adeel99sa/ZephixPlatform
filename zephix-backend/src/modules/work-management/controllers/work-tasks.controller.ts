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
import { WorkTasksService } from '../services/work-tasks.service';
import { TaskDependenciesService } from '../services/task-dependencies.service';
import { TaskCommentsService } from '../services/task-comments.service';
import { TaskActivityService } from '../services/task-activity.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  CreateWorkTaskDto,
  UpdateWorkTaskDto,
  ListWorkTasksQueryDto,
  BulkStatusUpdateDto,
  AddDependencyDto,
  RemoveDependencyDto,
  AddCommentDto,
} from '../dto';

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateWorkspaceId(workspaceId: string | undefined): string {
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

@Controller('work/tasks')
@ApiTags('Work Management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkTasksController {
  constructor(
    private readonly workTasksService: WorkTasksService,
    private readonly taskDependenciesService: TaskDependenciesService,
    private readonly taskCommentsService: TaskCommentsService,
    private readonly taskActivityService: TaskActivityService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  // 1. GET /api/work/tasks
  @Get()
  @ApiOperation({ summary: 'List work tasks' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'BACKLOG',
      'TODO',
      'IN_PROGRESS',
      'BLOCKED',
      'IN_REVIEW',
      'DONE',
      'CANCELED',
    ],
  })
  @ApiQuery({ name: 'assigneeUserId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'dueFrom',
    required: false,
    type: String,
    description: 'ISO date inclusive',
  })
  @ApiQuery({
    name: 'dueTo',
    required: false,
    type: String,
    description: 'ISO date inclusive',
  })
  @ApiQuery({
    name: 'includeStatuses',
    required: false,
    type: String,
    description: 'Comma-separated statuses',
  })
  @ApiQuery({
    name: 'excludeStatuses',
    required: false,
    type: String,
    description: 'Comma-separated statuses',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['dueDate', 'updatedAt', 'createdAt'],
  })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  async listTasks(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Query() query: ListWorkTasksQueryDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const result = await this.workTasksService.listTasks(
      auth,
      workspaceId,
      query,
    );
    return this.responseService.success(result);
  }

  // 2. POST /api/work/tasks
  @Post()
  @ApiOperation({ summary: 'Create a work task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
    schema: {
      properties: { code: { type: 'string', example: 'VALIDATION_ERROR' } },
    },
  })
  async createTask(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Body() dto: CreateWorkTaskDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const task = await this.workTasksService.createTask(auth, workspaceId, dto);
    return this.responseService.success(task);
  }

  // 3. PATCH /api/work/tasks/bulk
  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update task status' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Tasks updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - one or more tasks not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async bulkUpdateStatus(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Body() dto: BulkStatusUpdateDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const result = await this.workTasksService.bulkUpdateStatus(
      auth,
      workspaceId,
      dto,
    );
    return this.responseService.success(result);
  }

  // 3b. GET /api/work/tasks/:id/dependencies
  @Get(':id/dependencies')
  @ApiOperation({ summary: 'List dependencies for a task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Dependencies retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  async listDependencies(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const result = await this.taskDependenciesService.listDependencies(
      auth,
      workspaceId,
      taskId,
    );
    return this.responseService.success(result);
  }

  // 4. POST /api/work/tasks/:id/dependencies
  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add a dependency to a task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID (successor)' })
  @ApiResponse({ status: 201, description: 'Dependency added successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error (cycle or self-dependency)',
    schema: {
      properties: { code: { type: 'string', example: 'VALIDATION_ERROR' } },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - dependency already exists',
    schema: { properties: { code: { type: 'string', example: 'CONFLICT' } } },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - task not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async addDependency(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
    @Body() dto: AddDependencyDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const dependency = await this.taskDependenciesService.addDependency(
      auth,
      workspaceId,
      taskId, // successorTaskId
      dto,
    );
    return this.responseService.success(dependency);
  }

  // 5. DELETE /api/work/tasks/:id/dependencies
  @Delete(':id/dependencies')
  @ApiOperation({ summary: 'Remove a dependency from a task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID (successor)' })
  @ApiResponse({ status: 200, description: 'Dependency removed successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - dependency not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async removeDependency(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
    @Body() dto: RemoveDependencyDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    await this.taskDependenciesService.removeDependency(
      auth,
      workspaceId,
      taskId, // successorTaskId
      dto,
    );
    return this.responseService.success({ message: 'Dependency removed' });
  }

  // 6. POST /api/work/tasks/:id/comments
  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - task not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async addComment(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
    @Body() dto: AddCommentDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const comment = await this.taskCommentsService.addComment(
      auth,
      workspaceId,
      taskId,
      dto,
    );
    return this.responseService.success(comment);
  }

  // 7. GET /api/work/tasks/:id/comments
  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments for a task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  async listComments(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const result = await this.taskCommentsService.listComments(
      auth,
      workspaceId,
      taskId,
      limit ? parseInt(limit.toString(), 10) : 50,
      offset ? parseInt(offset.toString(), 10) : 0,
    );
    return this.responseService.success(result);
  }

  // 8. GET /api/work/tasks/:id/activity
  @Get(':id/activity')
  @ApiOperation({ summary: 'List activity feed for a task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Activity feed retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  async listActivity(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const result = await this.taskActivityService.list(
      auth,
      workspaceId,
      taskId,
      limit ? parseInt(limit.toString(), 10) : 50,
      offset ? parseInt(offset.toString(), 10) : 0,
    );
    return this.responseService.success(result);
  }

  // 9. GET /api/work/tasks/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a work task by ID' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - task not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async getTaskById(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const task = await this.workTasksService.getTaskById(
      auth,
      workspaceId,
      taskId,
    );
    return this.responseService.success(task);
  }

  // 10. PATCH /api/work/tasks/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update a work task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - task not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
    schema: {
      properties: { code: { type: 'string', example: 'VALIDATION_ERROR' } },
    },
  })
  async updateTask(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
    @Body() dto: UpdateWorkTaskDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const task = await this.workTasksService.updateTask(
      auth,
      workspaceId,
      taskId,
      dto,
    );
    return this.responseService.success(task);
  }

  // 11. DELETE /api/work/tasks/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a work task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - task not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async deleteTask(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    await this.workTasksService.deleteTask(auth, workspaceId, taskId);
    return this.responseService.success({ message: 'Task deleted' });
  }

  // 12. POST /api/work/tasks/:id/restore
  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted work task' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task restored successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - task is not deleted',
    schema: {
      properties: { code: { type: 'string', example: 'TASK_NOT_DELETED' } },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - task not found',
    schema: {
      properties: { code: { type: 'string', example: 'TASK_NOT_FOUND' } },
    },
  })
  async restoreTask(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') taskId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const task = await this.workTasksService.restoreTask(
      auth,
      workspaceId,
      taskId,
    );
    return this.responseService.success(task);
  }

  // 13. GET /api/work/tasks/stats/completion
  // Unified stats endpoint - uses header for workspace, optional query for project
  @Get('tasks/stats/completion')
  @ApiOperation({
    summary: 'Get task completion stats (workspace or project scoped)',
  })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required)',
    required: true,
  })
  @ApiQuery({
    name: 'projectId',
    description: 'Optional project ID to scope stats',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Completion stats retrieved',
    schema: {
      type: 'object',
      properties: {
        completed: { type: 'number', example: 5 },
        total: { type: 'number', example: 10 },
        ratio: {
          type: 'number',
          example: 0.5,
          description: 'Rounded to 4 decimals',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  async getTaskStats(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Query('projectId') projectId?: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Require read access
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const stats = await this.workTasksService.getCompletionStats(
      auth,
      workspaceId,
      projectId,
    );
    return this.responseService.success(stats);
  }
}
