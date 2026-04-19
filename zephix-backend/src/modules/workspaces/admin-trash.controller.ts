import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from '../../shared/guards/admin-only.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

/**
 * Org-wide trash (admin plane). Authorization: JwtAuthGuard + AdminOnlyGuard only.
 * Do not re-check with WorkspacePolicy.enforceDelete(u.role) — JWT `users.role` is often
 * `user`, which incorrectly 403s platform ADMINs (AdminOnlyGuard already passed).
 */
@Controller('admin/trash')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AdminTrashController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  listTrash(@Query('type') type: string, @CurrentUser() u: UserJwt) {
    return this.workspacesService.listTrash(u.organizationId, type);
  }

  @Post('purge')
  purge(
    @Body() body: { id?: string; days?: number },
    @CurrentUser() _u: UserJwt,
  ) {
    if (body.id) {
      return this.workspacesService.purge(body.id);
    }
    return this.workspacesService.purgeOldTrash(body.days);
  }
}
