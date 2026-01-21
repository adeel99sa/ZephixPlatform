import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { LessThan, DataSource } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { Project } from '../projects/entities/project.entity';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { TaskStatus } from '../work-management/enums/task.enums';
import { ProjectStatus, ProjectState } from '../projects/entities/project.entity';
import { In } from 'typeorm';
// Use WorkspaceAccessService from WorkspaceAccessModule (imported in module)
// Import it from the module, not the local service
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';

const DEFAULT_RETENTION_DAYS = Number(process.env.TRASH_RETENTION_DAYS ?? 30); // admin can change later

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private repo: TenantAwareRepository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private memberRepo: TenantAwareRepository<WorkspaceMember>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepo: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private taskRepo: TenantAwareRepository<WorkTask>,
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {
    // Debug metadata registration
    console.log(
      '[WorkspaceRepo] deleteDateColumn =',
      this.repo.metadata.deleteDateColumn?.propertyName,
    );
    console.log(
      '[WorkspaceRepo] columns =',
      this.repo.metadata.columns.map((c) => ({
        name: c.propertyName,
        databaseName: c.databaseName,
      })),
    );
  }

  /**
   * PROMPT 10: Find workspace by slug within organization
   */
  async findBySlug(
    organizationId: string,
    slug: string,
  ): Promise<Workspace | null> {
    try {
      const workspace = await this.repo.findOne({
        where: {
          organizationId,
          slug,
        },
      });
      return workspace || null;
    } catch (error) {
      return null;
    }
  }

  // ✅ NORMAL LIST with visibility filtering when feature flag enabled
  // Never throws - returns empty array on error or empty tables
  async listByOrg(organizationId: string, userId?: string, userRole?: string) {
    try {
      // organizationId now comes from tenant context
      const orgId = this.tenantContextService.assertOrganizationId();

      const featureEnabled =
        this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

      // If feature flag disabled or user is platform ADMIN, return all org workspaces
      const normalizedRole = normalizePlatformRole(userRole);
      if (!featureEnabled || normalizedRole === PlatformRole.ADMIN) {
        // TenantAwareRepository automatically scopes by organizationId
        const result = await this.repo
          .find({
            order: { createdAt: 'DESC' },
          })
          .catch(() => []);
        return result || [];
      }

      // Feature enabled and user is not admin - filter by workspace membership
      if (!userId) {
        return []; // Non-admin without userId sees nothing
      }

      // Get workspaces where user is a member
      // TenantAwareRepository automatically scopes WorkspaceMember by organizationId
      const memberWorkspaces = await this.memberRepo
        .find({
          where: { userId },
          relations: ['workspace'],
        })
        .catch(() => []);

      const workspaceIds = memberWorkspaces
        .map((m) => m.workspace?.id)
        .filter((id): id is string => !!id);

      if (workspaceIds.length === 0) {
        return [];
      }

      // Use tenant-aware query builder - organizationId filter is automatic
      const result = await this.repo
        .qb('w')
        .andWhere('w.id IN (:...workspaceIds)', { workspaceIds })
        .andWhere('w.deletedAt IS NULL')
        .orderBy('w.createdAt', 'DESC')
        .getMany()
        .catch(() => []);
      return result || [];
    } catch (error) {
      // Never throw - return empty array on any error
      return [];
    }
  }

  /**
   * PHASE 5.1: Get workspace by ID
   * Includes owner relation for Workspace Home page
   */
  async getById(organizationId: string, id: string) {
    try {
      // organizationId parameter kept for backward compatibility
      // TenantAwareRepository automatically scopes by organizationId from context
      const ws = await this.repo.findOne({
        where: { id },
        relations: ['owner'], // PHASE 5.1: Include owner for Workspace Home page
      });
      // Return null if not found (controller will handle response format)
      return ws || null;
    } catch (error) {
      // Never throw - return null on any error
      return null;
    }
  }

  async getUserRole(workspaceId: string, userId: string, organizationId: string): Promise<{
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
    canWrite: boolean;
    isReadOnly: boolean;
  }> {
    // Check if workspace exists and belongs to organization
    const workspace = await this.repo.findOne({
      where: { id: workspaceId, organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is workspace owner
    if (workspace.ownerId === userId) {
      return {
        role: 'OWNER',
        canWrite: true,
        isReadOnly: false,
      };
    }

    // Check workspace membership (only query the requesting user's record)
    const membership = await this.memberRepo.findOne({
      where: {
        workspaceId,
        userId,
        status: 'active',
      },
    });

    if (membership) {
      // Map workspace roles to API roles
      if (membership.role === 'workspace_owner') {
        return {
          role: 'OWNER',
          canWrite: true,
          isReadOnly: false,
        };
      } else if (membership.role === 'workspace_member') {
        return {
          role: 'MEMBER',
          canWrite: true,
          isReadOnly: false,
        };
      } else if (membership.role === 'workspace_viewer') {
        return {
          role: 'GUEST',
          canWrite: false,
          isReadOnly: true,
        };
      }
    }

    // Default: no membership found
    return {
      role: 'GUEST',
      canWrite: false,
      isReadOnly: true,
    };
  }

  async create(input: {
    name: string;
    slug: string;
    isPrivate?: boolean;
    organizationId: string;
    createdBy: string;
    ownerId?: string;
  }) {
    const useRaw = process.env.USE_RAW_SOFT_DELETE_QUERIES === 'true';

    if (useRaw) {
      // Replace raw query with save() for tenant safety
      // The raw query path is no longer needed - use standard save() which is tenant-safe
      const orgId = this.tenantContextService.assertOrganizationId();
      const entity = this.repo.create({
        name: input.name,
        slug: input.slug,
        isPrivate: !!input.isPrivate,
        organizationId: orgId,
        createdBy: input.createdBy,
        ownerId: input.ownerId || null,
      });
      return this.repo.save(entity);
    }

    const entity = this.repo.create({
      name: input.name,
      slug: input.slug,
      isPrivate: !!input.isPrivate,
      organizationId: input.organizationId,
      createdBy: input.createdBy,
      ownerId: input.ownerId || null,
    });
    return this.repo.save(entity);
  }

  /**
   * PROMPT 6: Create workspace with multiple owners
   *
   * Constraints enforced:
   * - Only platform ADMIN can create workspaces (enforced by RequireOrgRoleGuard)
   * - ownerUserIds array, minimum 1 owner required
   * - Each owner must be an org member with Member or Admin platform role
   * - Guest users (PlatformRole.VIEWER) CANNOT be workspace owners
   * - All owners are automatically added as workspace_owner members
   * - If creator is Admin and not in ownerUserIds, still add creator as workspace_owner for safety
   */
  async createWithOwners(input: {
    name: string;
    slug: string;
    description?: string;
    defaultMethodology?: string;
    isPrivate?: boolean;
    organizationId: string;
    createdBy: string;
    ownerUserIds: string[];
  }) {
    return this.dataSource.transaction(async (manager) => {
      const workspaceRepo = manager.getRepository(Workspace);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      // PROMPT 6: Validate all owner users exist and are in the organization
      const ownerUsers = await userRepo.find({
        where: input.ownerUserIds.map((id) => ({ id })),
      });

      if (ownerUsers.length !== input.ownerUserIds.length) {
        throw new NotFoundException('One or more owner users not found');
      }

      // Validate each owner is an active org member with Member or Admin platform role
      const ownerUserOrgs = await userOrgRepo.find({
        where: input.ownerUserIds.map((userId) => ({
          userId,
          organizationId: input.organizationId,
          isActive: true,
        })),
      });

      const ownerUserOrgMap = new Map(
        ownerUserOrgs.map((uo) => [uo.userId, uo]),
      );

      // Dev mode: auto-create UserOrganization records if missing
      const isDev = process.env.NODE_ENV !== 'production';
      for (const ownerUser of ownerUsers) {
        if (!ownerUserOrgMap.has(ownerUser.id)) {
          if (isDev && ownerUser.organizationId === input.organizationId) {
            const roleMapping: Record<
              string,
              'owner' | 'admin' | 'pm' | 'viewer'
            > = {
              owner: 'owner',
              admin: 'admin',
              member: 'pm',
              pm: 'pm',
              guest: 'viewer',
              viewer: 'viewer',
            };
            const orgRole = roleMapping[ownerUser.role || 'viewer'] || 'viewer';

            const newUserOrg = userOrgRepo.create({
              userId: ownerUser.id,
              organizationId: input.organizationId,
              isActive: true,
              role: orgRole,
            });
            const saved = await userOrgRepo.save(newUserOrg);
            ownerUserOrgMap.set(ownerUser.id, saved);
          } else {
            throw new ForbiddenException(
              `User ${ownerUser.id} must be an active member of the organization. Only existing organization users can be workspace owners.`,
            );
          }
        }

        // PROMPT 6: Guest users cannot be owners
        const userOrg = ownerUserOrgMap.get(ownerUser.id);
        const ownerPlatformRole = normalizePlatformRole(userOrg.role);
        if (ownerPlatformRole === PlatformRole.VIEWER) {
          throw new ForbiddenException(
            `Guest users cannot be workspace owners. User ${ownerUser.id} has Guest platform role. Workspace owners must be Members or Admins.`,
          );
        }
      }

      // Use first owner as workspace.ownerId (for backward compatibility)
      const primaryOwnerId = input.ownerUserIds[0];

      const entity = workspaceRepo.create({
        name: input.name,
        slug: input.slug,
        description: input.description,
        defaultMethodology: input.defaultMethodology,
        isPrivate: !!input.isPrivate,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        ownerId: primaryOwnerId,
      });
      const savedWorkspace = await workspaceRepo.save(entity);

      // PROMPT 6: Create workspace_members rows for all owners
      const ownerIdsSet = new Set(input.ownerUserIds);

      // If creator is Admin and not in ownerUserIds, add creator as workspace_owner for safety
      const creatorUserOrg = await userOrgRepo.findOne({
        where: {
          userId: input.createdBy,
          organizationId: input.organizationId,
          isActive: true,
        },
      });

      if (creatorUserOrg) {
        const creatorPlatformRole = normalizePlatformRole(creatorUserOrg.role);
        if (
          creatorPlatformRole === PlatformRole.ADMIN &&
          !ownerIdsSet.has(input.createdBy)
        ) {
          ownerIdsSet.add(input.createdBy);
        }
      }

      // Create or update workspace_members for all owners
      for (const ownerUserId of ownerIdsSet) {
        const existingMember = await memberRepo.findOne({
          where: {
            workspaceId: savedWorkspace.id,
            userId: ownerUserId,
          },
        });

        if (existingMember) {
          if (existingMember.role !== 'workspace_owner') {
            existingMember.role = 'workspace_owner';
            existingMember.updatedBy = input.createdBy;
            await memberRepo.save(existingMember);
          }
        } else {
          const member = memberRepo.create({
            workspaceId: savedWorkspace.id,
            userId: ownerUserId,
            role: 'workspace_owner',
            createdBy: input.createdBy,
          });
          await memberRepo.save(member);
        }
      }

      return savedWorkspace;
    });
  }

  /**
   * PHASE 5.1: Create workspace with owner (backward compatibility)
   * @deprecated Use createWithOwners instead
   */
  async createWithOwner(input: {
    name: string;
    slug: string;
    description?: string;
    defaultMethodology?: string;
    isPrivate?: boolean;
    organizationId: string;
    createdBy: string;
    ownerId: string;
  }) {
    return this.createWithOwners({
      ...input,
      ownerUserIds: [input.ownerId],
    });
  }

  /**
   * PROMPT 6: Update workspace owners
   *
   * Rules:
   * - Must keep at least one owner after update
   * - Guest cannot be owner
   * - Ensure workspace_members updated accordingly
   * - Keep last owner protection
   */
  async updateOwners(
    organizationId: string,
    workspaceId: string,
    ownerUserIds: string[],
    updatedBy: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const workspaceRepo = manager.getRepository(Workspace);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      // Validate workspace exists
      const workspace = await workspaceRepo.findOne({
        where: { id: workspaceId, organizationId },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      // PROMPT 6: Validate at least one owner
      if (!ownerUserIds || ownerUserIds.length === 0) {
        throw new ConflictException({
          code: 'LAST_OWNER_REQUIRED',
          message: 'At least one owner is required',
        });
      }

      // Validate all owner users exist and are in the organization
      const ownerUsers = await userRepo.find({
        where: ownerUserIds.map((id) => ({ id })),
      });

      if (ownerUsers.length !== ownerUserIds.length) {
        throw new NotFoundException('One or more owner users not found');
      }

      // Validate each owner is an active org member with Member or Admin platform role
      const ownerUserOrgs = await userOrgRepo.find({
        where: ownerUserIds.map((userId) => ({
          userId,
          organizationId,
          isActive: true,
        })),
      });

      const ownerUserOrgMap = new Map(
        ownerUserOrgs.map((uo) => [uo.userId, uo]),
      );

      for (const ownerUser of ownerUsers) {
        const userOrg = ownerUserOrgMap.get(ownerUser.id);
        if (!userOrg) {
          throw new ForbiddenException(
            `User ${ownerUser.id} must be an active member of the organization. Only existing organization users can be workspace owners.`,
          );
        }

        // PROMPT 6: Guest users cannot be owners
        const ownerPlatformRole = normalizePlatformRole(userOrg.role);
        if (ownerPlatformRole === PlatformRole.VIEWER) {
          throw new ForbiddenException(
            `Guest users cannot be workspace owners. User ${ownerUser.id} has Guest platform role. Workspace owners must be Members or Admins.`,
          );
        }
      }

      // Get current owners
      const currentOwners = await memberRepo.find({
        where: {
          workspaceId,
          role: 'workspace_owner',
        },
      });

      // PROMPT 6: Last owner protection - ensure at least one owner remains
      if (
        currentOwners.length === 1 &&
        !ownerUserIds.includes(currentOwners[0].userId)
      ) {
        throw new ConflictException({
          code: 'LAST_OWNER_REQUIRED',
          message: 'At least one owner is required',
        });
      }

      const newOwnerIdsSet = new Set(ownerUserIds);
      const currentOwnerIdsSet = new Set(currentOwners.map((o) => o.userId));

      // Remove owners that are no longer in the list
      for (const currentOwner of currentOwners) {
        if (!newOwnerIdsSet.has(currentOwner.userId)) {
          // Last owner protection check
          if (currentOwners.length === 1) {
            throw new ConflictException({
              code: 'LAST_OWNER_REQUIRED',
              message: 'At least one owner is required',
            });
          }
          await memberRepo.remove(currentOwner);
        }
      }

      // Add new owners or update existing members to workspace_owner
      for (const ownerUserId of ownerUserIds) {
        const existingMember = await memberRepo.findOne({
          where: {
            workspaceId,
            userId: ownerUserId,
          },
        });

        if (existingMember) {
          if (existingMember.role !== 'workspace_owner') {
            existingMember.role = 'workspace_owner';
            existingMember.updatedBy = updatedBy;
            await memberRepo.save(existingMember);
          }
        } else {
          const member = memberRepo.create({
            workspaceId,
            userId: ownerUserId,
            role: 'workspace_owner',
            createdBy: updatedBy,
          });
          await memberRepo.save(member);
        }
      }

      // Update workspace.ownerId to first owner (for backward compatibility)
      workspace.ownerId = ownerUserIds[0];
      await workspaceRepo.save(workspace);

      return { workspaceId, ownerUserIds };
    });
  }

  /**
   * Get workspace summary with counts
   */
  async getSummary(workspaceId: string, organizationId: string, userId: string) {
    // Verify workspace access (service method handles access check)
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      undefined, // platformRole will be derived from context
    );

    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    // Count projects
    const projectsTotal = await this.projectRepo.count({
      where: { workspaceId, organizationId },
    });

    // Count projects in progress (status ACTIVE or state ACTIVE)
    const projectsInProgress = await this.projectRepo.count({
      where: {
        workspaceId,
        organizationId,
        status: In([ProjectStatus.ACTIVE]),
      },
    });

    // Also count by state if needed
    const projectsInProgressByState = await this.projectRepo.count({
      where: {
        workspaceId,
        organizationId,
        state: ProjectState.ACTIVE,
      },
    });

    // Use the higher count (some projects might have status != ACTIVE but state == ACTIVE)
    const projectsInProgressCount = Math.max(projectsInProgress, projectsInProgressByState);

    // Count tasks
    const tasksTotal = await this.taskRepo.count({
      where: { workspaceId, organizationId },
    });

    // Count completed tasks
    const tasksCompleted = await this.taskRepo.count({
      where: {
        workspaceId,
        organizationId,
        status: TaskStatus.DONE,
      },
    });

    return {
      projectsTotal,
      projectsInProgress: projectsInProgressCount,
      tasksTotal,
      tasksCompleted,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateWorkspaceDto) {
    const ws = await this.getById(organizationId, id);
    Object.assign(ws, dto);
    return this.repo.save(ws);
  }

  // ✅ SOFT DELETE using TypeORM APIs
  async softDelete(id: string, userId: string) {
    await this.repo.update({ id }, { deletedBy: userId });
    await this.repo.softDelete(id); // ✅ sets deleted_at
    return { id };
  }

  // ✅ RESTORE using TypeORM APIs
  async restore(id: string) {
    await this.repo.restore(id); // ✅ clears deleted_at
    await this.repo.update({ id }, { deletedBy: null });
    return { id };
  }

  // ✅ TRASH LIST (must opt-in with .withDeleted())
  async listTrash(organizationId: string, type: string) {
    if (type !== 'workspace') {
      return [];
    }

    const useRaw = process.env.USE_RAW_SOFT_DELETE_QUERIES === 'true';

    if (useRaw) {
      // Replace raw query with qb() equivalent for tenant safety
      // organizationId filter is automatic via qb()
      return this.repo
        .qb('w')
        .withDeleted() // Include soft-deleted rows
        .andWhere('w.deleted_at IS NOT NULL')
        .orderBy('w.deleted_at', 'DESC')
        .getMany();
    }

    // Use tenant-aware query builder - organizationId filter is automatic
    return this.repo
      .qb('w')
      .withDeleted() // ✅ include soft-deleted rows in scope
      .andWhere('w.deleted_at IS NOT NULL')
      .orderBy('w.deleted_at', 'DESC')
      .getMany();
  }

  // ✅ PURGE (hard delete)
  async purge(id: string) {
    await this.repo.delete(id); // hard delete
    return { id };
  }

  // housekeeping (call via cron): purge trash older than retention
  async purgeOldTrash(retentionDays = DEFAULT_RETENTION_DAYS) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    await this.repo
      .createQueryBuilder()
      .withDeleted()
      .delete()
      .where('deleted_at < :cutoff', { cutoff })
      .execute();
  }
}
