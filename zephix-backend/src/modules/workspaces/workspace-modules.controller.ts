import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspaceModuleService } from './services/workspace-module.service';
import { RequireOrgRole } from './guards/require-org-role.guard';
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { PlatformRole } from '../../shared/enums/platform-roles.enum';
import {
  formatResponse,
  formatArrayResponse,
} from '../../shared/helpers/response.helper';

@Controller('workspaces/:workspaceId/modules')
@UseGuards(JwtAuthGuard)
export class WorkspaceModulesController {
  constructor(private workspaceModuleService: WorkspaceModuleService) {}

  @Get()
  async getAllModules(@Param('workspaceId') workspaceId: string) {
    const modules =
      await this.workspaceModuleService.getAllModules(workspaceId);
    return formatArrayResponse(modules);
  }

  @Get(':moduleKey')
  async getModule(
    @Param('workspaceId') workspaceId: string,
    @Param('moduleKey') moduleKey: string,
  ) {
    const module = await this.workspaceModuleService.getModule(
      workspaceId,
      moduleKey,
    );
    return formatResponse(module);
  }

  @Patch(':moduleKey')
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN)
  async setModule(
    @Param('workspaceId') workspaceId: string,
    @Param('moduleKey') moduleKey: string,
    @Body() dto: { enabled: boolean; config?: any },
    @CurrentUser() user: any,
  ) {
    // Only ADMIN can modify module config
    if (user.platformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can modify module configuration',
      );
    }

    const module = await this.workspaceModuleService.setModule(
      workspaceId,
      moduleKey,
      dto.enabled,
      dto.config,
    );
    return formatResponse(module);
  }
}
