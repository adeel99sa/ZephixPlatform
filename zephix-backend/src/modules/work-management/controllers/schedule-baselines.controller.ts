import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BaselineService } from '../services/baseline.service';

@Controller('work')
@UseGuards(JwtAuthGuard)
export class ScheduleBaselinesController {
  private readonly logger = new Logger(ScheduleBaselinesController.name);

  constructor(private readonly baselineService: BaselineService) {}

  @Post('projects/:projectId/baselines')
  async createBaseline(
    @Param('projectId') projectId: string,
    @Body() body: { name: string; description?: string; setActive?: boolean },
    @Req() req: any,
  ) {
    const { organizationId, id: userId, platformRole } = req.user;
    const workspaceId = req.headers['x-workspace-id'];
    const role = req.headers['x-workspace-role'];

    // Only owner or admin can create baselines
    if (!this.isOwnerOrAdmin(role, platformRole)) {
      throw new ForbiddenException('Only workspace owners or platform admins can create baselines');
    }

    const baseline = await this.baselineService.createBaseline({
      organizationId,
      workspaceId,
      projectId,
      name: body.name,
      description: body.description,
      setActive: body.setActive ?? false,
      createdBy: userId,
    });

    return { success: true, data: baseline };
  }

  @Get('projects/:projectId/baselines')
  async listBaselines(@Param('projectId') projectId: string) {
    const baselines = await this.baselineService.listBaselines(projectId);
    return { success: true, data: baselines };
  }

  @Get('baselines/:baselineId')
  async getBaseline(@Param('baselineId') baselineId: string) {
    const baseline = await this.baselineService.getBaseline(baselineId);
    return { success: true, data: baseline };
  }

  @Post('baselines/:baselineId/activate')
  async activateBaseline(
    @Param('baselineId') baselineId: string,
    @Req() req: any,
  ) {
    const { platformRole } = req.user;
    const role = req.headers['x-workspace-role'];

    if (!this.isOwnerOrAdmin(role, platformRole)) {
      throw new ForbiddenException('Only workspace owners or platform admins can activate baselines');
    }

    await this.baselineService.setActiveBaseline(baselineId);
    return { success: true };
  }

  @Get('baselines/:baselineId/compare')
  async compareBaseline(
    @Param('baselineId') baselineId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const result = await this.baselineService.compareBaseline(baselineId, asOfDate);
    return { success: true, data: result };
  }

  private isOwnerOrAdmin(workspaceRole: string | undefined, platformRole: string | undefined): boolean {
    if (platformRole?.toUpperCase() === 'ADMIN') return true;
    return workspaceRole === 'workspace_owner' || workspaceRole === 'delivery_owner';
  }
}
