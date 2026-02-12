import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
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
import { WorkflowConfigService } from '../services/workflow-config.service';
import { UpdateWorkflowConfigDto } from '../dto/update-workflow-config.dto';
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

@ApiTags('Workflow Config')
@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class WorkflowConfigController {
  constructor(
    private readonly workflowConfigService: WorkflowConfigService,
    private readonly responseService: ResponseService,
  ) {}

  @Get(':projectId/workflow-config')
  @ApiOperation({ summary: 'Get project workflow config (WIP limits)' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Workflow config retrieved' })
  async getConfig(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const limits = await this.workflowConfigService.getEffectiveLimits(
      auth,
      workspaceId,
      projectId,
    );
    return this.responseService.success(limits);
  }

  @Put(':projectId/workflow-config')
  @ApiOperation({ summary: 'Set project workflow config (WIP limits)' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Workflow config updated' })
  async upsertConfig(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateWorkflowConfigDto,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    const limits = await this.workflowConfigService.upsertConfig(
      auth,
      workspaceId,
      projectId,
      dto,
    );
    return this.responseService.success(limits);
  }
}
