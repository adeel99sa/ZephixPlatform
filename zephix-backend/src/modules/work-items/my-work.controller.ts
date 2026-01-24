/**
 * PHASE 7 MODULE 7.2: My Work Controller
 * Primary endpoint: GET /api/my-work
 */
import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MyWorkService } from './services/my-work.service';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { MyWorkQueryDto } from './dto/my-work-query.dto';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

@Controller('my-work')
@UseGuards(JwtAuthGuard)
export class MyWorkController {
  constructor(
    private readonly myWorkService: MyWorkService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @Get()
  async getMyWork(@Req() req: AuthRequest, @Query() query: MyWorkQueryDto) {
    const ctx = getAuthContext(req);
    const { platformRole, organizationId, userId } = ctx;

    const userRole = normalizePlatformRole(platformRole);
    const isAdmin = userRole === PlatformRole.ADMIN;
    const isViewer = userRole === PlatformRole.VIEWER;

    const effectiveQuery: MyWorkQueryDto = { ...query };

    if (effectiveQuery.workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        effectiveQuery.workspaceId,
        organizationId,
        userId,
        platformRole,
      );
      if (!hasAccess) {
        throw new ForbiddenException({
          code: 'WORKSPACE_ACCESS_DENIED',
          message: 'Access denied to workspace',
        });
      }
    }

    if (isViewer) {
      if (effectiveQuery.assignee && effectiveQuery.assignee !== 'me') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Viewers can only view their own assigned work',
        });
      }
      effectiveQuery.assignee = 'me';
    }

    if (!effectiveQuery.workspaceId && !isAdmin) {
      if (effectiveQuery.assignee && effectiveQuery.assignee !== 'me') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message:
            'Non-admin users cannot view all assignees without workspace scope',
        });
      }
    }

    if (effectiveQuery.workspaceId && !isAdmin) {
      if (effectiveQuery.assignee === 'any') {
        const effectiveRole =
          await this.workspaceAccessService.getEffectiveWorkspaceRole({
            userId,
            orgId: organizationId,
            platformRole: userRole,
            workspaceId: effectiveQuery.workspaceId,
          });
        if (effectiveRole !== 'workspace_owner') {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Only workspace owners can view all assignees in My Work',
          });
        }
      }
    }

    return this.myWorkService.getMyWork(ctx, effectiveQuery);
  }
}
