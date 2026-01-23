import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';
import { DashboardAccessGuard, requireDashboardEdit, requireDashboardExport } from '../guards/dashboard-access.guard';
import { DashboardAccessService } from '../services/dashboard-access.service';
import { DashboardsService } from '../services/dashboards.service';
import { CreateDashboardShareDto, UpdateDashboardShareDto } from '../dto/dashboard-share.dto';

@Controller('/api/org/dashboards')
@UseGuards(JwtAuthGuard)
export class OrgDashboardsController {
  constructor(
    private readonly responseService: ResponseService,
    private readonly dashboardsService: DashboardsService,
    private readonly accessService: DashboardAccessService,
  ) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    const auth = getAuthContext(req);
    const dashboards = await this.dashboardsService.listOrgDashboards(auth);
    return this.responseService.success(dashboards);
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: { name: string; description?: string }) {
    const auth = getAuthContext(req);
    const dashboard = await this.dashboardsService.createOrgDashboard(auth, body);
    return this.responseService.success(dashboard);
  }

  @Get(':id')
  @UseGuards(DashboardAccessGuard)
  async get(@Req() req: AuthRequest & any, @Param('id') id: string) {
    this.accessService.requireMin(req.dashboardAccess, 'VIEW');
    const auth = getAuthContext(req);
    const dashboard = await this.dashboardsService.getDashboardById(auth, id);
    // Include access info in response for frontend gating
    return this.responseService.success({
      ...dashboard,
      access: {
        level: req.dashboardAccess.level,
        exportAllowed: req.dashboardAccess.exportAllowed,
      },
    });
  }

  @Patch(':id')
  @UseGuards(DashboardAccessGuard)
  async update(
    @Req() req: AuthRequest & any,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    this.accessService.requireMin(req.dashboardAccess, 'EDIT');
    const auth = getAuthContext(req);
    const dashboard = await this.dashboardsService.updateDashboard(
      id,
      body,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(dashboard);
  }

  @Delete(':id')
  @UseGuards(DashboardAccessGuard)
  async remove(@Req() req: AuthRequest & any, @Param('id') id: string) {
    this.accessService.requireMin(req.dashboardAccess, 'OWNER');
    const auth = getAuthContext(req);
    await this.dashboardsService.deleteDashboard(
      id,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success({ message: 'Dashboard deleted' });
  }

  @Post(':id/exports')
  @UseGuards(DashboardAccessGuard)
  async export(
    @Req() req: AuthRequest & any,
    @Param('id') id: string,
    @Body() body: { format: 'PDF' | 'XLSX'; filters?: Record<string, unknown> },
  ) {
    requireDashboardExport(req);
    // TODO: Phase 6.4 - Implement export job queue
    return this.responseService.success({
      message: 'Export job queued',
      jobId: 'placeholder',
    });
  }

  // Phase 6.1: Share management routes
  @Get(':dashboardId/shares')
  async listShares(@Req() req: AuthRequest, @Param('dashboardId') dashboardId: string) {
    const auth = getAuthContext(req);
    const shares = await this.dashboardsService.listOrgDashboardShares(auth, dashboardId);
    return this.responseService.success(shares);
  }

  @Post(':dashboardId/shares')
  async createShare(
    @Req() req: AuthRequest,
    @Param('dashboardId') dashboardId: string,
    @Body() dto: CreateDashboardShareDto,
  ) {
    const auth = getAuthContext(req);
    const share = await this.dashboardsService.createOrgDashboardShare(auth, dashboardId, dto);
    return this.responseService.success(share);
  }

  @Patch(':dashboardId/shares/:shareId')
  async updateShare(
    @Req() req: AuthRequest,
    @Param('dashboardId') dashboardId: string,
    @Param('shareId') shareId: string,
    @Body() dto: UpdateDashboardShareDto,
  ) {
    const auth = getAuthContext(req);
    const share = await this.dashboardsService.updateOrgDashboardShare(auth, dashboardId, shareId, dto);
    return this.responseService.success(share);
  }

  @Delete(':dashboardId/shares/:shareId')
  async deleteShare(
    @Req() req: AuthRequest,
    @Param('dashboardId') dashboardId: string,
    @Param('shareId') shareId: string,
  ) {
    const auth = getAuthContext(req);
    await this.dashboardsService.deleteOrgDashboardShare(auth, dashboardId, shareId);
    return this.responseService.success({ message: 'Share revoked' });
  }
}
