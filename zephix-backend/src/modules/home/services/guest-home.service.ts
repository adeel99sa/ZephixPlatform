import { Injectable, Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { IsNull } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class GuestHomeService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private workspaceRepo: TenantAwareRepository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepo: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private memberRepo: TenantAwareRepository<WorkspaceMember>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getGuestHomeData(userId: string, organizationId: string) {
    const orgId = this.tenantContextService.assertOrganizationId();

    // Get accessible workspace IDs for guest user
    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        organizationId,
        userId,
        PlatformRole.VIEWER,
      );

    let accessibleWorkspacesCount = 0;
    let accessibleProjectsCount = 0;

    if (accessibleWorkspaceIds === null) {
      // Admin access - count all (shouldn't happen for guest, but handle gracefully)
      accessibleWorkspacesCount = await this.workspaceRepo.count({
        where: {
          deletedAt: IsNull(),
        },
      });

      // Project entity doesn't have deletedAt - count all
      accessibleProjectsCount = await this.projectRepo.count();
    } else if (accessibleWorkspaceIds.length > 0) {
      // Count accessible workspaces
      accessibleWorkspacesCount = accessibleWorkspaceIds.length;

      // Count projects in accessible workspaces (Project entity doesn't have deletedAt)
      accessibleProjectsCount = await this.projectRepo.count({
        where: {
          workspaceId: accessibleWorkspaceIds as any,
        },
      });
    }
    // If accessibleWorkspaceIds is empty array, counts remain 0

    return {
      readOnlySummary: {
        accessibleWorkspacesCount,
        accessibleProjectsCount,
      },
    };
  }
}
