import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { WorkspaceDashboardDataService } from '../services/workspace-dashboard-data.service';

@Controller('workspaces/:workspaceId/dashboard-data')
@ApiTags('workspace-dashboard-data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceDashboardDataController {
  constructor(
    private readonly dashboardDataService: WorkspaceDashboardDataService,
    private readonly responseService: ResponseService,
  ) {}

  private getContext(req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }
    return { organizationId, userId, platformRole };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Workspace dashboard summary data' })
  @ApiParam({ name: 'workspaceId', type: String })
  async summary(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = this.getContext(req);
    return this.responseService.success(
      await this.dashboardDataService.getSummary(
        ctx.organizationId,
        workspaceId,
        ctx.userId,
        ctx.platformRole,
      ),
    );
  }

  @Get('projects')
  @ApiOperation({ summary: 'Workspace recent projects data' })
  @ApiParam({ name: 'workspaceId', type: String })
  async projects(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = this.getContext(req);
    return this.responseService.success(
      await this.dashboardDataService.getRecentProjects(
        ctx.organizationId,
        workspaceId,
        ctx.userId,
        ctx.platformRole,
      ),
    );
  }

  @Get('milestones')
  @ApiOperation({ summary: 'Workspace upcoming milestones data' })
  @ApiParam({ name: 'workspaceId', type: String })
  async milestones(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = this.getContext(req);
    return this.responseService.success(
      await this.dashboardDataService.getUpcomingMilestones(
        ctx.organizationId,
        workspaceId,
        ctx.userId,
        ctx.platformRole,
      ),
    );
  }

  @Get('risks')
  @ApiOperation({ summary: 'Workspace open risks data' })
  @ApiParam({ name: 'workspaceId', type: String })
  async risks(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = this.getContext(req);
    return this.responseService.success(
      await this.dashboardDataService.getOpenRisks(
        ctx.organizationId,
        workspaceId,
        ctx.userId,
        ctx.platformRole,
      ),
    );
  }

  @Get('documents')
  @ApiOperation({ summary: 'Workspace documents summary data' })
  @ApiParam({ name: 'workspaceId', type: String })
  async documents(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = this.getContext(req);
    return this.responseService.success(
      await this.dashboardDataService.getDocumentsSummary(
        ctx.organizationId,
        workspaceId,
        ctx.userId,
        ctx.platformRole,
      ),
    );
  }
}
