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

@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class EarnedValueController {
  private readonly logger = new Logger(EarnedValueController.name);

  constructor(private readonly evService: EarnedValueService) {}

  @Get(':projectId/earned-value')
  async getEarnedValue(
    @Param('projectId') projectId: string,
    @Query('asOfDate') asOfDate: string,
    @Query('baselineId') baselineId: string | undefined,
    @Req() req: any,
  ) {
    const { organizationId, platformRole } = req.user;
    const workspaceId = req.headers['x-workspace-id'];
    const role = req.headers['x-workspace-role'];

    // Only owner or admin
    this.requireOwnerOrAdmin(role, platformRole);

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
    const role = req.headers['x-workspace-role'];

    this.requireOwnerOrAdmin(role, platformRole);

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
    const { platformRole } = req.user;
    const role = req.headers['x-workspace-role'];

    this.requireOwnerOrAdmin(role, platformRole);

    const history = await this.evService.getHistory({ projectId, from, to });
    return { success: true, data: history };
  }

  private requireOwnerOrAdmin(workspaceRole: string | undefined, platformRole: string | undefined): void {
    if (platformRole?.toUpperCase() === 'ADMIN') return;
    if (workspaceRole === 'workspace_owner' || workspaceRole === 'delivery_owner') return;
    throw new ForbiddenException('Only workspace owners or platform admins can access earned value data');
  }
}
