import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WorkItemService } from './work-item.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetTenant,
  TenantContext,
} from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkItemStatus } from './entities/work-item.entity';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('work-items')
@UseGuards(JwtAuthGuard)
export class WorkItemController {
  constructor(private readonly workItemService: WorkItemService) {}

  @Get()
  async list(
    @GetTenant() tenant: TenantContext,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    if (!workspaceId && !projectId) {
      throw new BadRequestException('workspaceId or projectId required');
    }

    return this.workItemService.list({
      organizationId: tenant.organizationId,
      workspaceId,
      projectId,
      status,
      assigneeId,
    });
  }

  @Get('project/:projectId')
  async listByProject(
    @GetTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.workItemService.list({
      organizationId: tenant.organizationId,
      projectId,
      status,
    });
  }

  @Post()
  async create(
    @GetTenant() tenant: TenantContext,
    @Body() dto: CreateWorkItemDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.workItemService.create({
      ...dto,
      organizationId: tenant.organizationId,
      createdBy: user.id,
    });
  }

  @Get(':id')
  async getOne(@GetTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.workItemService.getOne(id, tenant.organizationId);
  }

  @Patch(':id')
  async update(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.workItemService.update(id, tenant.organizationId, {
      ...dto,
      updatedBy: user.id,
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body('status') status: WorkItemStatus,
    @CurrentUser() user: UserJwt,
  ) {
    return this.workItemService.update(id, tenant.organizationId, {
      status,
      updatedBy: user.id,
    });
  }

  @Get('stats/completed-ratio/by-project/:projectId')
  async completedRatioByProject(
    @GetTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.workItemService.completedRatioByProject({
      organizationId: tenant.organizationId,
      projectId,
    });
  }

  @Get('stats/completed-ratio/by-workspace/:workspaceId')
  async completedRatioByWorkspace(
    @GetTenant() tenant: TenantContext,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workItemService.completedRatioByWorkspace({
      organizationId: tenant.organizationId,
      workspaceId,
    });
  }

  @Get('stats/completed-ratio/by-organization')
  async completedRatioByOrganization(@GetTenant() tenant: TenantContext) {
    return this.workItemService.completedRatioByWorkspace({
      organizationId: tenant.organizationId,
    });
  }
}
