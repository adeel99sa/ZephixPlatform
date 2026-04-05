import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminOnlyGuard } from '../../shared/guards/admin-only.guard';
import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../common/constants/platform-retention.constants';
import {
  formatArrayResponse,
  formatResponse,
} from '../../shared/helpers/response.helper';
import { ProjectsService } from '../projects/services/projects.service';
import { WorkspacesService } from './workspaces.service';
import { WorkspacePolicy } from './workspace.policy';
import { PlatformTrashAdminService } from './platform-trash-admin.service';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('admin/trash')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AdminTrashController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
    private readonly platformTrashAdmin: PlatformTrashAdminService,
    private readonly policy: WorkspacePolicy,
  ) {}

  @Get('retention-policy')
  retentionPolicy() {
    return formatResponse({
      defaultRetentionDays: PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
    });
  }

  @Get()
  async listTrash(@Query('type') type: string, @CurrentUser() u: UserJwt) {
    this.policy.enforceDelete(u.role);
    const items = await this.platformTrashAdmin.listTrashItems(
      u.organizationId,
      type,
    );
    return formatArrayResponse(items);
  }

  @Post('purge')
  async purge(
    @Body()
    body: {
      id?: string;
      days?: number;
      /** When id is set: workspace (default) or project permanent delete */
      entityType?: 'workspace' | 'project';
    },
    @CurrentUser() u: UserJwt,
  ) {
    this.policy.enforceDelete(u.role);
    if (body.id) {
      if (body.entityType === 'project') {
        const result = await this.projectsService.purgeTrashedProjectById(
          u.organizationId,
          body.id,
          u.id,
        );
        return formatResponse(result);
      }
      const result = await this.workspacesService.purge(body.id);
      return formatResponse(result);
    }

    const result = await this.platformTrashAdmin.purgeStaleTrash(
      u.organizationId,
      u.id,
      body.days,
      'manual_http',
    );
    return formatResponse(result);
  }
}
