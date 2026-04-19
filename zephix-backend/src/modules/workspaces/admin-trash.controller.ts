import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  platformRole?: string;
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
  async listTrash(
    @Query('type') type: string,
    @Query('page') pageStr: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() u: UserJwt,
  ) {
    this.policy.enforceDelete(u.role);
    const hasPage = pageStr !== undefined && pageStr !== '';
    if (hasPage) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.min(
        Math.max(1, parseInt(limitStr || '25', 10) || 25),
        100,
      );
      const result = await this.platformTrashAdmin.listTrashItemsPaged({
        organizationId: u.organizationId,
        type,
        search,
        page,
        limit,
      });
      return {
        data: result.items,
        meta: result.meta,
      };
    }

    const items = await this.platformTrashAdmin.listTrashItems(
      u.organizationId,
      type,
      search,
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

  @Post(':entityType/:id/restore')
  async restoreTrashItem(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @CurrentUser() u: UserJwt,
  ) {
    this.policy.enforceDelete(u.role);
    const result = await this.platformTrashAdmin.restoreTrashItem(
      entityType,
      id,
      {
        id: u.id,
        organizationId: u.organizationId,
        platformRole: u.platformRole,
      },
    );
    return formatResponse(result);
  }

  @Delete()
  async clearAllTrash(@CurrentUser() u: UserJwt) {
    this.policy.enforceDelete(u.role);
    const result = await this.platformTrashAdmin.clearAllTrash(
      u.organizationId,
      u.id,
    );
    return formatResponse(result);
  }

  @Delete(':entityType/:id')
  async permanentlyDeleteTrashItem(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @CurrentUser() u: UserJwt,
  ) {
    this.policy.enforceDelete(u.role);
    const result = await this.platformTrashAdmin.permanentlyDeleteTrashItem(
      entityType,
      id,
      {
        id: u.id,
        organizationId: u.organizationId,
        platformRole: u.platformRole,
      },
    );
    return formatResponse(result);
  }
}
