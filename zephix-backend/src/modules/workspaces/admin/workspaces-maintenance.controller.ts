import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireOrgRole } from '../guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../guards/require-org-role.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

import { CleanupTestWorkspacesDto } from './dto/cleanup-test-workspaces.dto';
import { WorkspacesMaintenanceService } from './workspaces-maintenance.service';

@Controller('admin/workspaces/maintenance')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
export class WorkspacesMaintenanceController {
  constructor(private readonly svc: WorkspacesMaintenanceService) {}

  @Get('/cleanup-test/candidates')
  async candidates() {
    const data = await this.svc.listCleanupCandidates();
    return { data, meta: { count: data.length } };
  }

  @Post('/cleanup-test')
  async cleanup(@Body() dto: CleanupTestWorkspacesDto) {
    const data = await this.svc.cleanupTestWorkspaces({
      dryRun: dto.dryRun,
      ids: dto.ids,
    });
    return { data, meta: { orgId: data.orgId } };
  }
}
