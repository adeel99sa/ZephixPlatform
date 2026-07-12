import { Injectable, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../tenancy/tenancy.module';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { WorkspaceRole } from '../workspaces/entities/workspace.entity';
import { TenantContextService } from '../tenancy/tenant-context.service';

/**
 * WorkspaceRoleGuard - Sprint 6
 * Enforces read vs write access based on workspace membership role
 */
@Injectable()
export class WorkspaceRoleGuardService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private readonly memberRepo: TenantAwareRepository<WorkspaceMember>,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Require read access to workspace
   * All roles can read
   */
  async requireWorkspaceRead(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const organizationId = this.tenantContext.assertOrganizationId();

    const membership = await this.memberRepo.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Read only access',
      });
    }

    // All roles can read - no further check needed
  }

  /**
   * Require workspace WRITE access for STRUCTURE / GOVERNANCE operations —
   * phases, iterations, gate approvals, templates-instantiate, importer,
   * risks, KPIs, attachments, delivery-owner assignment, etc. Owner-only.
   *
   * DO NOT widen this allowlist for task CRUD — use requireWorkspaceTaskWrite
   * for that (WA-1). Widening here would hand workspace_members structural
   * powers (creating phases, instantiating templates, approving gates) that
   * the product intends to stay owner/admin.
   */
  async requireWorkspaceWrite(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const organizationId = this.tenantContext.assertOrganizationId();

    const membership = await this.memberRepo.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Read only access',
      });
    }

    // Structure/governance write role: workspace_owner only.
    // WA-1: 'delivery_owner' removed — it is a vestigial project-scoped role
    // that is unassignable as a workspace role (AddMemberDto rejects it and
    // workspace-members.service throws on it), so it never matched here. A
    // Project Lead is stored separately as projects.delivery_owner_user_id.
    const writeRoles: WorkspaceRole[] = ['workspace_owner'];

    if (!writeRoles.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Read only access',
      });
    }
  }

  /**
   * WA-1: Require workspace TASK-write access — day-to-day execution.
   * Workspace members may create and update tasks in their workspace
   * (industry-default), distinct from structure/governance which stays
   * owner-only (requireWorkspaceWrite). workspace_viewer stays read-only.
   *
   * This does NOT bypass downstream policy: task create/update still run the
   * OrgPolicy checks and the governance rule engine in the service layer.
   * Allowlist: workspace_owner, workspace_member. The vestigial project-scoped
   * roles (delivery_owner/stakeholder) are intentionally excluded.
   */
  async requireWorkspaceTaskWrite(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    this.tenantContext.assertOrganizationId();

    const membership = await this.memberRepo.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Read only access',
      });
    }

    const taskWriteRoles: WorkspaceRole[] = [
      'workspace_owner',
      'workspace_member',
    ];

    if (!taskWriteRoles.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Read only access',
      });
    }
  }

  /**
   * Require workspace_owner role. Only the workspace owner may call
   * owner-only mutations (e.g. PATCH capabilities).
   */
  async requireWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.memberRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Not a workspace member',
      });
    }
    if (membership.role !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Workspace owner only',
      });
    }
  }

  /**
   * Get user's workspace role
   * Returns null if not a member
   */
  async getWorkspaceRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRole | null> {
    const membership = await this.memberRepo.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    return membership ? membership.role : null;
  }
}
