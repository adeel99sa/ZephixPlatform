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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MyWorkService } from './services/my-work.service';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { MyWorkQueryDto } from './dto/my-work-query.dto';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('my-work')
@UseGuards(JwtAuthGuard)
export class MyWorkController {
  constructor(
    private readonly myWorkService: MyWorkService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @Get()
  async getMyWork(
    @CurrentUser() user: UserJwt,
    @Req() req: AuthRequest,
    @Query() query: MyWorkQueryDto,
  ) {
    const ctx = getAuthContext(req);
    const { platformRole, organizationId, userId } = ctx;

    // PHASE 7 MODULE 7.2: Block Guest (VIEWER)
    const userRole = normalizePlatformRole(platformRole);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException('Forbidden');
    }

    const isAdmin = userRole === PlatformRole.ADMIN;

    // If workspaceId provided, verify access
    if (query.workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        query.workspaceId,
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
    } else {
      // Org-wide query: enforce scoping rules
      if (!isAdmin) {
        // Non-admin cannot use assignee=any without workspaceId
        if (query.assignee && query.assignee !== 'me') {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Non-admin users cannot view all assignees without workspace scope',
          });
        }
      }
      // Note: VIEWER is already blocked at the top of the method
    }

    return this.myWorkService.getMyWork(ctx, query);
  }
}
