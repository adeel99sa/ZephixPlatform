/**
 * Guard that enforces workspace access control.
 *
 * Policy: Cross-tenant workspace access returns 403 Forbidden (not 404).
 * This provides consistent "permission denied" semantics and prevents
 * information leakage about workspace existence in other organizations.
 *
 * **Slug routes:** When `params.slug` is present and neither `params.id` nor
 * `params.workspaceId` is set, the guard resolves the workspace **within the
 * caller's organization only**, then applies the same checks as UUID routes.
 * Use `@CrossTenantStatus` / `SlugAccessErrorSemantics` for per-route 404 masking
 * (AD-027 batch 1a precursor).
 *
 * See: docs/PHASE2A_MIGRATION_PLAYBOOK.md for policy details.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  SetMetadata,
  Inject,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IsNull } from 'typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import {
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS,
  type SlugAccessErrorSemantics,
} from './cross-tenant-status.decorator';

export type WorkspaceAccessMode =
  | 'read'
  | 'viewer'
  | 'write'
  | 'member'
  | 'ownerOrAdmin';

export const RequireWorkspaceAccess = (mode: WorkspaceAccessMode) =>
  SetMetadata('workspaceAccessMode', mode);

/** Effective HTTP statuses for slug-param resolution (defaults 403 / 403). */
type EffectiveSlugSemantics = {
  notFoundStatus: 403 | 404;
  forbiddenStatus: 403 | 404;
};

@Injectable()
export class RequireWorkspaceAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private wmRepo: TenantAwareRepository<WorkspaceMember>,
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private wsRepo: TenantAwareRepository<Workspace>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const mode = this.reflector.get<string>(
      'workspaceAccessMode',
      context.getHandler(),
    );

    if (!mode) {
      return true; // No access requirement
    }

    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    if (!this.tenantContextService.getOrganizationId()) {
      return this.tenantContextService.runWithTenant({ organizationId }, async () => {
        const resolved = await this.resolveWorkspaceRouting(
          request,
          organizationId,
          context,
        );
        return this.tenantContextService.runWithTenant(
          { organizationId, workspaceId: resolved.workspaceId },
          () =>
            this.doActivate(
              request,
              user,
              mode,
              resolved.workspaceId,
              resolved.resolvedViaSlug,
              resolved.slugSemantics,
            ),
        );
      });
    }

    const resolved = await this.resolveWorkspaceRouting(
      request,
      organizationId,
      context,
    );
    return this.doActivate(
      request,
      user,
      mode,
      resolved.workspaceId,
      resolved.resolvedViaSlug,
      resolved.slugSemantics,
    );
  }

  /**
   * Reads optional metadata for slug routes. Defaults preserve AD-027 / playbook
   * cross-tenant policy unless `@CrossTenantStatus` / `SlugAccessErrorSemantics` overrides.
   */
  private resolveSlugSemantics(
    context: ExecutionContext,
  ): EffectiveSlugSemantics {
    const raw = this.reflector.getAllAndOverride<
      SlugAccessErrorSemantics | undefined
    >(WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS, [
      context.getHandler(),
      context.getClass(),
    ]);
    return {
      notFoundStatus: raw?.notFoundStatus ?? 403,
      forbiddenStatus: raw?.forbiddenStatus ?? 403,
    };
  }

  /**
   * Resolves `workspaceId` from `params.id`, `params.workspaceId`, or tenant-scoped `params.slug`.
   */
  private async resolveWorkspaceRouting(
    request: { params: Record<string, string | undefined> },
    organizationId: string,
    context: ExecutionContext,
  ): Promise<{
    workspaceId: string;
    resolvedViaSlug: boolean;
    slugSemantics: EffectiveSlugSemantics | null;
  }> {
    const fromId = request.params.id || request.params.workspaceId;
    if (fromId) {
      return {
        workspaceId: fromId,
        resolvedViaSlug: false,
        slugSemantics: null,
      };
    }

    const slug = request.params.slug;
    if (slug) {
      const slugSemantics = this.resolveSlugSemantics(context);
      const workspaceId = await this.resolveWorkspaceIdFromSlug(
        slug,
        organizationId,
      );
      if (!workspaceId) {
        throw new HttpException(
          slugSemantics.notFoundStatus === 404
            ? 'Workspace not found'
            : 'Workspace does not belong to your organization',
          slugSemantics.notFoundStatus,
        );
      }
      return { workspaceId, resolvedViaSlug: true, slugSemantics };
    }

    throw new NotFoundException('Workspace ID required');
  }

  /** Tenant-scoped slug lookup; never returns workspaces outside caller org. */
  private async resolveWorkspaceIdFromSlug(
    slug: string,
    organizationId: string,
  ): Promise<string | null> {
    const workspace = await this.wsRepo.findOne({
      where: {
        slug,
        organizationId,
        deletedAt: IsNull(),
      },
      select: ['id', 'organizationId'],
    });
    return workspace?.id ?? null;
  }

  private async doActivate(
    request: any,
    user: any,
    mode: string,
    workspaceId: string,
    resolvedViaSlug: boolean,
    slugSemantics: EffectiveSlugSemantics | null,
  ): Promise<boolean> {
    // Verify workspace exists and belongs to user's organization
    // TenantAwareRepository automatically scopes by organizationId from context
    const workspace = await this.wsRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'organizationId'],
    });

    if (!workspace) {
      // Workspace not found in user's organization - return 403 for security
      // (Don't leak information about workspace existence in other orgs)
      throw new ForbiddenException(
        'Workspace does not belong to your organization',
      );
    }

    // Double-check organizationId matches (defense in depth)
    if (workspace.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'Workspace does not belong to your organization',
      );
    }

    // Check if user is org admin (admins have access to all workspaces).
    // Prefer platformRole (org-context) over legacy user.role, same as RequireOrgRoleGuard.
    const normalizedRole = normalizePlatformRole(
      user.platformRole ?? user.role ?? 'viewer',
    );
    const isAdmin =
      isAdminRole(normalizedRole) || (user.permissions?.isAdmin ?? false);

    if (mode === 'ownerOrAdmin' && isAdmin) {
      // Attach workspace role to request for use in controller
      request.workspaceRole = 'workspace_owner'; // Admins treated as workspace owners
      return true;
    }

    // Get user's workspace role
    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId: user.id },
    });

    // PROMPT 8 A2: Block suspended members
    if (member && member.status === 'suspended') {
      throw new ForbiddenException({
        code: 'SUSPENDED',
        message: 'Access suspended',
      });
    }

    const wsRole: WorkspaceRole | null = member?.role || null;

    // Attach workspace role to request
    request.workspaceRole = wsRole;

    // Check access based on mode.
    // 'read' is an explicit alias for 'viewer' (membership + feature flag via WorkspaceAccessService).
    // 'write' is an explicit alias for 'member' (owner or member can write).
    switch (mode) {
      case 'read':
      case 'viewer': {
        const allowed = await this.workspaceAccessService.canAccessWorkspace(
          workspaceId,
          user.organizationId,
          user.id,
          user.platformRole ?? user.role,
        );
        if (!allowed) {
          if (resolvedViaSlug && slugSemantics) {
            const st = slugSemantics.forbiddenStatus;
            throw new HttpException(
              st === 404
                ? 'Workspace not found'
                : 'You do not have access to this workspace',
              st,
            );
          }
          throw new ForbiddenException(
            'You do not have access to this workspace',
          );
        }
        return true;
      }

      case 'write':
      case 'member':
        // Workspace owner or member can mutate.
        return wsRole === 'workspace_owner' || wsRole === 'workspace_member';

      case 'ownerOrAdmin':
        // Workspace owner or org admin only.
        return wsRole === 'workspace_owner' || isAdmin;

      default:
        throw new ForbiddenException('Insufficient workspace permissions');
    }
  }
}
