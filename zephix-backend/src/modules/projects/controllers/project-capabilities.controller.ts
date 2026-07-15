import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { ProjectCapabilitiesService } from '../capabilities/project-capabilities.service';
import { UpdateCapabilitiesDto } from '../capabilities/update-capabilities.dto';
import { formatResponse } from '../../../shared/helpers/response.helper';

@ApiTags('Project Capabilities')
@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectCapabilitiesController {
  constructor(
    private readonly capabilitiesService: ProjectCapabilitiesService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get(':projectId/capabilities')
  @ApiOperation({ summary: 'Get project methodology capability toggles' })
  @ApiParam({ name: 'workspaceId', type: String })
  @ApiParam({ name: 'projectId', type: String })
  async getCapabilities(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, user.id);
    const caps = await this.capabilitiesService.get(
      projectId,
      workspaceId,
      user.organizationId,
    );
    return formatResponse(caps);
  }

  @Patch(':projectId/capabilities')
  @ApiOperation({
    summary: 'Update project methodology capability toggles (workspace-owner only)',
  })
  @ApiParam({ name: 'workspaceId', type: String })
  @ApiParam({ name: 'projectId', type: String })
  async patchCapabilities(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateCapabilitiesDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    await this.workspaceRoleGuard.requireWorkspaceOwner(workspaceId, user.id);
    const caps = await this.capabilitiesService.patch(
      projectId,
      workspaceId,
      user.organizationId,
      dto,
      {
        userId: user.id,
        platformRole: user.platformRole ?? user.role,
        workspaceRole: user.workspaceRole ?? null,
        ipAddress:
          (req?.headers?.['x-forwarded-for'] as string | undefined) ??
          req?.ip ??
          null,
        userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
      },
    );
    return formatResponse(caps);
  }
}
