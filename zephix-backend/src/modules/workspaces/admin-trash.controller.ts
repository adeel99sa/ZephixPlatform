import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { WorkspacePolicy } from './workspace.policy';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('admin/trash')
@UseGuards(JwtAuthGuard)
export class AdminTrashController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly policy: WorkspacePolicy,
  ) {}

  @Get()
  listTrash(@Query('type') type: string, @CurrentUser() u: UserJwt) {
    console.log('AdminTrashController.listTrash called with:', {
      type,
      organizationId: u.organizationId,
      role: u.role,
    });
    this.policy.enforceDelete(u.role);
    return this.workspacesService.listTrash(u.organizationId, type);
  }

  @Get('test')
  test() {
    console.log('AdminTrashController.test called');
    return { message: 'Admin trash test endpoint working' };
  }

  @Post('purge')
  purge(
    @Body() body: { id?: string; days?: number },
    @CurrentUser() u: UserJwt,
  ) {
    this.policy.enforceDelete(u.role);
    if (body.id) {
      return this.workspacesService.purge(body.id);
    }
    return this.workspacesService.purgeOldTrash(body.days);
  }
}
