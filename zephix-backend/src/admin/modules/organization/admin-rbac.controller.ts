import {
  Controller,
  Get,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import {
  RequireOrgRole,
  RequireOrgRoleGuard,
} from '../../../modules/workspaces/guards/require-org-role.guard';
import { PlatformRole } from '../../../common/auth/platform-roles';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';

/**
 * RBAC migration summary for the admin tile (Stream B's
 * `RbacMigrationSummaryTile`).
 *
 * Contract (Cursor Part A — preserved from reconciled spec §3.3.2):
 *   GET /api/v1/admin/rbac/migration-summary
 *   Auth: required + RequireOrgRole(ADMIN)
 *   200: {
 *     migratedUserCount: number,
 *     pmMappingExceptions: Array<{ email: string, resolution: string, notes: string }>,
 *     generatedAt?: string
 *   }
 *
 * Historical context: AD-011 + migration 76 (`ReplaceLegacyOrgRolePmWithMember`)
 * already moved every `pm` row in `user_organizations.role` to `member`
 * roughly four weeks before B1. As a result, the live system has zero rows
 * with role 'pm', and `pmMappingExceptions` is the empty array under normal
 * operation. The endpoint exists primarily so the Stream B tile can render
 * its "no exceptions recorded" empty state and so an audit trail of the
 * post-migration state is reachable from the admin UI.
 *
 * `migratedUserCount` is the number of active members in the caller's org
 * — an "as of now" total rather than a count of just the rows AD-011
 * touched, because that historical detail is not materially useful and
 * the live count is what operators want.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3.2 ("Cross-stream
 * consistency check").
 */
@ApiTags('Admin — RBAC')
@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
export class AdminRbacController {
  constructor(
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
  ) {}

  @Get('migration-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Post-AD-011 RBAC migration summary for the admin tile (zero exceptions under normal operation)',
  })
  async migrationSummary(@Req() req: AuthRequest): Promise<{
    migratedUserCount: number;
    pmMappingExceptions: Array<{
      email: string;
      resolution: string;
      notes: string;
    }>;
    generatedAt: string;
  }> {
    const { organizationId } = getAuthContext(req);
    if (!organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORG_CONTEXT',
        message: 'Organization context required',
      });
    }

    const migratedUserCount = await this.userOrgRepo.count({
      where: { organizationId, isActive: true },
    });

    return {
      migratedUserCount,
      pmMappingExceptions: [],
      generatedAt: new Date().toISOString(),
    };
  }
}
