import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireWorkspaceAccessGuard } from '../../workspaces/guards/require-workspace-access.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WorkItemsSimpleService } from '../services/work-items-simple.service';
import { CreateWorkItemSimpleDto } from '../dto/create-work-item-simple.dto';
import { UpdateWorkItemSimpleDto } from '../dto/update-work-item-simple.dto';
import {
  formatResponse,
  formatArrayResponse,
} from '../../../shared/helpers/response.helper';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('workspaces/:workspaceId/projects/:projectId/work-items')
@UseGuards(JwtAuthGuard, RequireWorkspaceAccessGuard)
export class WorkItemsSimpleController {
  constructor(private readonly svc: WorkItemsSimpleService) {}

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() u: UserJwt,
    @Body() dto: CreateWorkItemSimpleDto,
  ) {
    const item = await this.svc.create(
      workspaceId,
      u.organizationId,
      projectId,
      dto,
    );
    return formatResponse(item);
  }

  @Get()
  async list(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const items = await this.svc.list(workspaceId, projectId);
    return formatArrayResponse(items);
  }

  @Get(':idOrKey')
  async get(
    @Param('workspaceId') workspaceId: string,
    @Param('idOrKey') idOrKey: string,
  ) {
    const item = await this.svc.get(workspaceId, idOrKey);
    return formatResponse(item);
  }

  @Patch(':workItemId')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('workItemId') workItemId: string,
    @Body() dto: UpdateWorkItemSimpleDto,
  ) {
    const item = await this.svc.update(workspaceId, workItemId, dto);
    return formatResponse(item);
  }

  @Delete(':workItemId')
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('workItemId') workItemId: string,
  ) {
    const result = await this.svc.remove(workspaceId, workItemId);
    return formatResponse(result);
  }
}
