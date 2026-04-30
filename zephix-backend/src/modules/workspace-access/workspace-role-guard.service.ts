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
   * Require write access to workspace
   * Only delivery_owner and workspace_owner can write
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

    // Write roles: delivery_owner and workspace_owner
    const writeRoles: WorkspaceRole[] = ['delivery_owner', 'workspace_owner'];

    if (!writeRoles.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Read only access',
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
