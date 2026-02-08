import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SprintsService } from '../services/sprints.service';
import { CreateSprintDto } from '../dto/create-sprint.dto';
import { UpdateSprintDto } from '../dto/update-sprint.dto';
import { ResponseService } from '../../../shared/services/response.service';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';

function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'x-workspace-id header is required',
    });
  }
  return workspaceId;
}
import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AssignTasksDto {
  @ApiProperty({ description: 'Task IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];
}

@ApiTags('Sprints')
@Controller('work/sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(
    private readonly sprintsService: SprintsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List sprints for a project' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Sprints retrieved' })
  async listSprints(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const sprints = await this.sprintsService.listSprints(
      auth,
      workspaceId,
      projectId,
    );
    return this.responseService.success(sprints);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sprint details with stats' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint retrieved' })
  async getSprint(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') id: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const sprint = await this.sprintsService.getSprintWithStats(
      auth,
      workspaceId,
      id,
    );
    return this.responseService.success(sprint);
  }

  @Post()
  @ApiOperation({ summary: 'Create a sprint' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 201, description: 'Sprint created' })
  async createSprint(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Body() dto: CreateSprintDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const sprint = await this.sprintsService.createSprint(
      auth,
      workspaceId,
      dto,
    );
    return this.responseService.success(sprint);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sprint' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint updated' })
  async updateSprint(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const sprint = await this.sprintsService.updateSprint(
      auth,
      workspaceId,
      id,
      dto,
    );
    return this.responseService.success(sprint);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a sprint (PLANNING only)' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Sprint deleted' })
  async deleteSprint(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') id: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.sprintsService.deleteSprint(auth, workspaceId, id);
    return this.responseService.success({ deleted: true });
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Assign tasks to a sprint' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Tasks assigned' })
  async assignTasks(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') id: string,
    @Body() dto: AssignTasksDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const result = await this.sprintsService.assignTasks(
      auth,
      workspaceId,
      id,
      dto.taskIds,
    );
    return this.responseService.success(result);
  }

  @Delete(':id/tasks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove tasks from a sprint' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'id', description: 'Sprint ID' })
  @ApiResponse({ status: 200, description: 'Tasks removed from sprint' })
  async removeTasks(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('id') id: string,
    @Body() dto: AssignTasksDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const result = await this.sprintsService.removeTasks(
      auth,
      workspaceId,
      id,
      dto.taskIds,
    );
    return this.responseService.success(result);
  }
}
