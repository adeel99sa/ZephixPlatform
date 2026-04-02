import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardsService } from '../services/dashboards.service';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { DashboardVisibility } from '../entities/dashboard.entity';

@Controller('workspaces/:workspaceId/dashboards')
@ApiTags('workspace-dashboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceDashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List dashboards for a workspace' })
  @ApiParam({ name: 'workspaceId', type: String })
  @ApiResponse({ status: 200, description: 'Workspace dashboards fetched' })
  async listByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }
    const dashboards = await this.dashboardsService.listDashboards(
      organizationId,
      userId,
      platformRole,
      workspaceId,
    );
    return this.responseService.success(dashboards);
  }

  @Post()
  @ApiOperation({ summary: 'Create dashboard in workspace' })
  @ApiParam({ name: 'workspaceId', type: String })
  @ApiResponse({ status: 201, description: 'Workspace dashboard created' })
  async createInWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateDashboardDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);
    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }
    const dashboard = await this.dashboardsService.createDashboard(
      {
        ...dto,
        workspaceId,
        visibility: dto.visibility || DashboardVisibility.WORKSPACE,
      },
      organizationId,
      userId,
      workspaceId,
    );
    return this.responseService.success(dashboard);
  }
}
