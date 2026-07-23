import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EarnedValueService } from '../services/earned-value.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class EarnedValueController {
  private readonly logger = new Logger(EarnedValueController.name);

  constructor(
    private readonly evService: EarnedValueService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get(':projectId/earned-value')
  async getEarnedValue(
    @Param('projectId') projectId: string,
    @Query('asOfDate') asOfDate: string,
    @Query('baselineId') baselineId: string | undefined,
    @Req() req: any,
  ) {
    const { organizationId, platformRole } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    // SEC-XORG-READ-1: role is derived server-side from the membership record,
    // never read from the client-supplied x-workspace-role header (spoofable).
    await this.requireOwnerOrAdmin(req, workspaceId, platformRole);

    const result = await this.evService.computeEarnedValue({
      organizationId,
      workspaceId,
      projectId,
      asOfDate,
      baselineId,
    });

    return { success: true, data: result };
  }

  @Post(':projectId/earned-value/snapshot')
  async createSnapshot(
    @Param('projectId') projectId: string,
    @Body() body: { asOfDate: string; baselineId?: string },
    @Req() req: any,
  ) {
    const { organizationId, platformRole } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    await this.requireOwnerOrAdmin(req, workspaceId, platformRole);

    const snapshot = await this.evService.createSnapshot({
      organizationId,
      workspaceId,
      projectId,
      asOfDate: body.asOfDate,
      baselineId: body.baselineId,
    });

    return { success: true, data: snapshot };
  }

  @Get(':projectId/earned-value/history')
  async getHistory(
    @Param('projectId') projectId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Req() req: any,
  ) {
    const { organizationId, platformRole } = req.user;
    const workspaceId = req.headers['x-workspace-id'];

    await this.requireOwnerOrAdmin(req, workspaceId, platformRole);

    const history = await this.evService.getHistory({
      organizationId,
      projectId,
      from,
      to,
    });
    return { success: true, data: history };
  }

  /**
   * Authorize owner-or-admin using a SERVER-DERIVED workspace role.
   *
   * SEC-XORG-READ-1: the previous implementation trusted a client-supplied
   * `x-workspace-role` header, which any caller could forge. The role is now
   * resolved from the authenticated session (req.user.userId) against the
   * workspace membership record. Platform admins bypass the workspace role.
   */
  private async requireOwnerOrAdmin(
    req: any,
    workspaceId: string | undefined,
    platformRole: string | undefined,
  ): Promise<void> {
    if (platformRole?.toUpperCase() === 'ADMIN') return;

    const userId = req.user?.userId;
    const workspaceRole =
      workspaceId && userId
        ? await this.workspaceRoleGuard.getWorkspaceRole(workspaceId, userId)
        : null;

    if (workspaceRole === 'workspace_owner' || workspaceRole === 'delivery_owner') {
      return;
    }
    throw new ForbiddenException(
      'Only workspace owners or platform admins can access earned value data',
    );
  }
}
