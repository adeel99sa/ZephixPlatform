import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { LessThan, DataSource, Repository, In } from 'typeorm';
import {
  Workspace,
  WorkspaceComplexityMode,
} from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import {
  Project,
  ProjectStatus,
  ProjectState,
} from '../projects/entities/project.entity';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { TaskStatus } from '../work-management/enums/task.enums';
import { bootLog } from '../../common/utils/debug-boot';
// Use WorkspaceAccessService from WorkspaceAccessModule (imported in module)
// Import it from the module, not the local service
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../common/constants/platform-retention.constants';
import { WorkRisk } from '../work-management/entities/work-risk.entity';
import { PhaseGateDefinition } from '../work-management/entities/phase-gate-definition.entity';
import { WorkResourceAllocation } from '../work-management/entities/work-resource-allocation.entity';
import { Dashboard } from '../dashboards/entities/dashboard.entity';
import { AuditService } from '../audit/services/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/audit.constants';
import { EntitlementService } from '../billing/entitlements/entitlement.service';

/**
 * B2 PR2 / item 1 follow-up: deprecated complexity-mode values that
 * `setComplexityMode` rejects on writes. Defined as a string-typed Set
 * so we don't have to reference `WorkspaceComplexityMode.SIMPLE` /
 * `.ADVANCED` directly (which would emit TS deprecation hints). The
 * intent is the same — these specific values are write-protected — but
 * the implementation reads cleaner.
 */
const LEGACY_COMPLEXITY_MODE_VALUES: ReadonlySet<string> = new Set([
  'simple',
  'advanced',
]);

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

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
    // B2 — optional so existing unit tests that construct the service
    // directly (no Nest DI) keep compiling. In production both providers
    // come from @Global() modules.
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly entitlementService?: EntitlementService,
  ) {
    // Debug metadata registration (only when DEBUG_BOOT=true)
    bootLog(
      '[WorkspaceRepo] columns:',
      this.repo.metadata.columns.length,
      'deleteDateColumn:',
      this.repo.metadata.deleteDateColumn?.propertyName || 'none',
    );
  }

  /* ─── Slug helpers ─────────────────────────────────────────── */

  /** Convert any string to a URL-safe slug */
  private slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80);
  }

  /**
   * Ensure slug is unique within organization.
   * Checks soft-deleted rows too (the DB unique index covers them).
   * Appends -2, -3, ... if needed.
   */
  private async ensureUniqueSlug(
    orgId: string,
    base: string,
    workspaceRepo: Repository<Workspace>,
  ): Promise<string> {
    const slug = base || 'workspace';
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
      const count = await workspaceRepo
        .createQueryBuilder('w')
        .withDeleted()
        .where('w.organization_id = :orgId', { orgId })
        .andWhere('w.slug = :candidate', { candidate })
        .getCount();
      if (count === 0) return candidate;
    }
    throw new ConflictException('Unable to generate a unique workspace slug');
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

  /**
   * Tenant-scoped slug lookup (AD-027): slug must resolve within the given org only.
   * Delegates to {@link findBySlug}; argument order matches guard/service consumers.
   */
  async findBySlugInOrg(
    slug: string,
    organizationId: string,
  ): Promise<Workspace | null> {
    return this.findBySlug(organizationId, slug);
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

  async getUserRole(
    workspaceId: string,
    userId: string,
    organizationId: string,
  ): Promise<{
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
   * - Platform ADMIN only can create workspaces (controller + org-role guard; Guest blocked upstream)
   * - ownerUserIds array, minimum 1 owner required
   * - Each owner must be an org member with Member or Admin platform role
   * - Guest users (PlatformRole.VIEWER) CANNOT be workspace owners
   * - All owners are automatically added as workspace_owner members
   * - Creator is always added as workspace_owner
   */
  async createWithOwners(input: {
    name: string;
    slug?: string;
    description?: string;
    defaultMethodology?: string;
    isPrivate?: boolean;
    organizationId: string;
    createdBy: string;
    ownerUserIds: string[];
  }) {
    // B2 / ADR-B2-002: enforce per-org workspace quota before opening a
    // transaction. Counts non-deleted workspaces; throws Forbidden with
    // code MAX_WORKSPACES_LIMIT_EXCEEDED when the plan limit is reached.
    if (this.entitlementService) {
      const currentCount = await this.repo.count({
        where: { organizationId: input.organizationId },
        // soft-deleted (deletedAt set) rows are excluded by the
        // @DeleteDateColumn default behavior.
      });
      await this.entitlementService.assertWithinLimit(
        input.organizationId,
        'max_workspaces',
        currentCount,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const workspaceRepo = manager.getRepository(Workspace);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      // Generate unique slug (from provided slug or from name)
      const baseSlug = input.slug?.trim()
        ? this.slugify(input.slug)
        : this.slugify(input.name);
      const slug = await this.ensureUniqueSlug(
        input.organizationId,
        baseSlug,
        workspaceRepo,
      );

      const ownerUserIds = Array.from(
        new Set([...input.ownerUserIds, input.createdBy]),
      );

      // PROMPT 6: Validate all owner users exist and are in the organization
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
              'owner' | 'admin' | 'member' | 'viewer'
            > = {
              owner: 'owner',
              admin: 'admin',
              member: 'member',
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
      const primaryOwnerId = ownerUserIds[0];

      const entity = workspaceRepo.create({
        name: input.name,
        slug, // server-generated unique slug
        description: input.description,
        defaultMethodology: input.defaultMethodology,
        isPrivate: !!input.isPrivate,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        ownerId: primaryOwnerId,
      });
      const savedWorkspace = await workspaceRepo.save(entity);

      // PROMPT 6: Create workspace_members rows for all owners
      const ownerIdsSet = new Set(ownerUserIds);

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
            organizationId: input.organizationId,
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
    slug?: string;
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
  async getSummary(
    workspaceId: string,
    organizationId: string,
    userId: string,
  ) {
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
    const projectsInProgressCount = Math.max(
      projectsInProgress,
      projectsInProgressByState,
    );

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
    return {
      id,
      trashRetentionDays: PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
    };
  }

  // ✅ RESTORE using TypeORM APIs
  async restore(id: string) {
    await this.repo.restore(id); // ✅ clears deleted_at
    await this.repo.update({ id }, { deletedBy: null });
    return { id };
  }

  /**
   * Soft-deleted workspaces in current org (tenant context). Used by Archive & delete admin list.
   */
  async listTrashedWorkspaces(): Promise<Workspace[]> {
    const useRaw = process.env.USE_RAW_SOFT_DELETE_QUERIES === 'true';

    if (useRaw) {
      return this.repo
        .qb('w')
        .withDeleted()
        .andWhere('w.deleted_at IS NOT NULL')
        .orderBy('w.deleted_at', 'DESC')
        .getMany();
    }

    return this.repo
      .qb('w')
      .withDeleted()
      .andWhere('w.deleted_at IS NOT NULL')
      .orderBy('w.deleted_at', 'DESC')
      .getMany();
  }

  /**
   * Hard-delete a single workspace and its full dependency graph.
   * Purges all projects (and their children) first, then workspace-level entities,
   * then the workspace itself. See trash_dependency_matrix.md.
   */
  async purge(id: string) {
    await this.dataSource.transaction(async (manager) => {
      await this.purgeWorkspaceGraph(manager, [id]);
    });
    return { id };
  }

  /**
   * Hard-delete workspaces that have been soft-deleted longer than retention.
   * Requires tenant context (organization scoped via TenantAwareRepository).
   */
  async purgeOldTrash(
    retentionDays = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
  ): Promise<{ workspacesPurged: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const stale = await this.repo
      .qb('w')
      .withDeleted()
      .andWhere('w.deleted_at IS NOT NULL')
      .andWhere('w.deleted_at < :cutoff', { cutoff })
      .getMany();

    if (stale.length === 0) {
      return { workspacesPurged: 0 };
    }

    const ids = stale.map((w) => w.id);

    await this.dataSource.transaction(async (manager) => {
      await this.purgeWorkspaceGraph(manager, ids);
    });

    return { workspacesPurged: ids.length };
  }

  /**
   * Hard-delete the full dependency graph for one or more workspaces within a transaction.
   * Order: projects (with their full graph) → dashboards → workspace.
   * CASCADE children (members, module configs, invite links, notifications, docs, forms,
   * rag_index, org_invite_workspace_assignments) are handled by DB.
   */
  private async purgeWorkspaceGraph(
    manager: import('typeorm').EntityManager,
    workspaceIds: string[],
  ): Promise<void> {
    if (workspaceIds.length === 0) return;

    const projectRepo = manager.getRepository(Project);
    const taskRepo = manager.getRepository(WorkTask);
    const riskRepo = manager.getRepository(WorkRisk);
    const gateDefRepo = manager.getRepository(PhaseGateDefinition);
    const allocRepo = manager.getRepository(WorkResourceAllocation);
    const dashboardRepo = manager.getRepository(Dashboard);
    const workspaceRepo = manager.getRepository(Workspace);

    // 1. Find all projects in these workspaces (including soft-deleted)
    const projects = await projectRepo
      .createQueryBuilder('p')
      .withDeleted()
      .where('"workspace_id" IN (:...wsIds)', { wsIds: workspaceIds })
      .select(['p.id'])
      .getMany();

    const projectIds = projects.map((p) => p.id);

    if (projectIds.length > 0) {
      // 2. Purge full project graph for all projects in these workspaces
      // RESTRICT FK children first
      await allocRepo
        .createQueryBuilder()
        .delete()
        .from(WorkResourceAllocation)
        .where('"project_id" IN (:...ids)', { ids: projectIds })
        .execute();

      await gateDefRepo
        .createQueryBuilder()
        .delete()
        .from(PhaseGateDefinition)
        .where('"project_id" IN (:...ids)', { ids: projectIds })
        .execute();

      await riskRepo
        .createQueryBuilder()
        .delete()
        .from(WorkRisk)
        .where('"project_id" IN (:...ids)', { ids: projectIds })
        .execute();

      await taskRepo
        .createQueryBuilder()
        .delete()
        .from(WorkTask)
        .where('"project_id" IN (:...ids)', { ids: projectIds })
        .execute();

      await projectRepo
        .createQueryBuilder()
        .delete()
        .from(Project)
        .where('id IN (:...ids)', { ids: projectIds })
        .execute();
    }

    // 3. Dashboards (no FK to workspace, must clean explicitly)
    await dashboardRepo
      .createQueryBuilder()
      .delete()
      .from(Dashboard)
      .where('"workspace_id" IN (:...wsIds)', { wsIds: workspaceIds })
      .execute();

    // 4. Workspace (CASCADE handles: members, module_configs, invite_links,
    //    notifications, docs, forms, rag_index, org_invite_workspace_assignments)
    await workspaceRepo
      .createQueryBuilder()
      .delete()
      .from(Workspace)
      .where('id IN (:...wsIds)', { wsIds: workspaceIds })
      .execute();
  }

  /**
   * B2 PR2 — admin snapshot enrichment.
   *
   * Returns the org's workspaces enriched with `projectCount` (count of
   * non-deleted projects in each workspace) and `owners` (the workspace_owner
   * members joined to user identity). budgetStatus / capacityStatus /
   * openExceptions remain UNKNOWN/0 placeholders until B10 / B13 wire the
   * underlying engines.
   *
   * Single roundtrip per workspace would be O(N) — instead, two grouped
   * queries: one for project counts, one for owners. Final shape is built
   * in JS by indexing both results by workspaceId.
   */
  async getSnapshotRows(
    organizationId: string,
    userId: string,
    userRole: string,
  ): Promise<
    Array<{
      workspaceId: string;
      workspaceName: string;
      projectCount: number;
      budgetStatus: 'UNKNOWN';
      capacityStatus: 'UNKNOWN';
      openExceptions: number;
      owners: Array<{ userId: string; name: string; email: string }>;
      status: 'ACTIVE' | 'ARCHIVED';
    }>
  > {
    const workspaces = await this.listByOrg(organizationId, userId, userRole);
    if (!workspaces || workspaces.length === 0) {
      return [];
    }

    const wsIds = workspaces.map((w) => w.id);

    // Project counts (non-deleted, scoped by org for tenant safety).
    const projectCountRows: Array<{ workspace_id: string; count: string }> =
      await this.dataSource.query(
        `
        SELECT workspace_id, COUNT(*)::int AS count
        FROM projects
        WHERE organization_id = $1
          AND workspace_id = ANY($2::uuid[])
          AND deleted_at IS NULL
        GROUP BY workspace_id
        `,
        [organizationId, wsIds],
      );
    const projectCountByWs = new Map<string, number>(
      projectCountRows.map((r) => [r.workspace_id, Number(r.count)]),
    );

    // Owners: workspace_members.role='workspace_owner' joined to users.
    const ownerRows: Array<{
      workspace_id: string;
      user_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    }> = await this.dataSource.query(
      `
      SELECT m.workspace_id, m."userId" AS user_id, u.email,
             u."firstName" AS first_name, u."lastName" AS last_name
      FROM workspace_members m
      JOIN users u ON u.id = m."userId"
      WHERE m.organization_id = $1
        AND m.workspace_id = ANY($2::uuid[])
        AND m.role = 'workspace_owner'
      ORDER BY m.workspace_id, u.email
      `,
      [organizationId, wsIds],
    );
    const ownersByWs = new Map<
      string,
      Array<{ userId: string; name: string; email: string }>
    >();
    for (const r of ownerRows) {
      const list = ownersByWs.get(r.workspace_id) ?? [];
      const fullName =
        [r.first_name, r.last_name].filter(Boolean).join(' ').trim() ||
        r.email;
      list.push({ userId: r.user_id, name: fullName, email: r.email });
      ownersByWs.set(r.workspace_id, list);
    }

    return workspaces.map((ws) => ({
      workspaceId: ws.id,
      workspaceName: ws.name ?? 'Workspace',
      projectCount: projectCountByWs.get(ws.id) ?? 0,
      // B10 wires real values; for now preserve the stable UNKNOWN literal
      // so the frontend's empty-state contract doesn't churn.
      budgetStatus: 'UNKNOWN' as const,
      // B13 wires real values likewise.
      capacityStatus: 'UNKNOWN' as const,
      // Governance enforcement engine wires this later.
      openExceptions: 0,
      owners: ownersByWs.get(ws.id) ?? [],
      status: ws.deletedAt ? ('ARCHIVED' as const) : ('ACTIVE' as const),
    }));
  }

  // ========== AD-026 / B2: Complexity Mode ==========

  /**
   * Get the complexity mode for a workspace.
   * Returns the current tier. During the Stage 1→Stage 2 backfill window,
   * legacy values (simple, advanced) may still be returned for unmigrated
   * rows. Callers should treat unknown values as `lean` for safety.
   */
  async getComplexityMode(
    organizationId: string,
    workspaceId: string,
  ): Promise<WorkspaceComplexityMode> {
    const ws = await this.getById(organizationId, workspaceId);
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }
    return ws.complexityMode;
  }

  /**
   * Set the complexity mode for a workspace.
   *
   * B2 / ADR-B2-004: enforces Org Admin only at the service level (defense
   * in depth — the controller guard performs the same check). Throws
   * `ForbiddenException` with code `WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY`
   * if the caller's normalized platform role is below ADMIN.
   *
   * Strict actor identity (PR1 review Q4): if the caller's platform role
   * cannot be resolved, throws `InternalServerErrorException` with code
   * `COMPLEXITY_MODE_AUDIT_ACTOR_MISSING` rather than emitting audit data
   * with a placeholder actor. A null platform role at this point means
   * the upstream JWT or RequireOrgRoleGuard configuration is broken — fail
   * loud, never write garbage audit rows.
   *
   * Emits an `audit_events` row with action `complexity_mode_changed`.
   * Migration 18000000000171 (also in PR1) widens the action CHECK
   * constraint so emits land in the table on first PR2 controller invoke.
   */
  async setComplexityMode(
    organizationId: string,
    workspaceId: string,
    mode: WorkspaceComplexityMode,
    actor: {
      userId: string;
      platformRole: string | null | undefined;
      workspaceRole?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
  ): Promise<void> {
    // Q4: actor identity must be present. A null/empty platformRole on the
    // raw input means upstream JWT or RequireOrgRoleGuard didn't populate
    // it — refuse to silently downgrade to VIEWER (which would then trip
    // the admin check and emit a misleading 403). Note: normalizePlatformRole
    // defaults missing input to PlatformRole.VIEWER for legacy compatibility,
    // so this check has to happen on the raw actor field, not on the
    // normalized output.
    if (actor.platformRole == null || actor.platformRole === '') {
      throw new InternalServerErrorException({
        code: 'COMPLEXITY_MODE_AUDIT_ACTOR_MISSING',
        message:
          'Authenticated actor has no resolvable platform role. ' +
          'This indicates a JWT or RequireOrgRoleGuard configuration bug.',
      });
    }

    const actorPlatformRole = normalizePlatformRole(actor.platformRole);
    if (actorPlatformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY',
        message:
          'Only organization admins can change a workspace complexity mode. ' +
          'Workspace owners may request a change through the UI but cannot execute it.',
      });
    }

    // PR2 / item 3 from PR1 self-audit: defense-in-depth at the service
    // layer. The HTTP DTO already restricts inbound writes to lean | standard
    // | governed, but a programmatic caller (other services, scripts, future
    // internal code) could otherwise pass SIMPLE or ADVANCED. ADR-B2-001
    // forbids new write paths for legacy values; enforce it here.
    //
    // Comparing against a string-typed Set instead of the deprecated enum
    // members (PR1 self-audit follow-up #1) — avoids the TS-deprecation
    // hint that compelling the comparison directly would emit, while
    // still preserving the intent ("these specific legacy values are
    // write-protected").
    if (LEGACY_COMPLEXITY_MODE_VALUES.has(mode as string)) {
      throw new BadRequestException({
        code: 'WORKSPACE_COMPLEXITY_MODE_LEGACY_VALUE_REJECTED',
        message:
          'Legacy complexity mode values (simple, advanced) are write-protected. ' +
          'Use lean, standard, or governed. Legacy values remain readable until ' +
          'the Stage 3 cleanup migration in PR3.',
        attemptedValue: mode,
      });
    }

    const ws = await this.getById(organizationId, workspaceId);
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }

    const previousMode = ws.complexityMode;
    if (previousMode === mode) {
      // No-op: don't emit audit churn for idempotent calls.
      return;
    }

    ws.complexityMode = mode;
    await this.repo.save(ws);

    if (this.auditService) {
      await this.auditService.record({
        organizationId,
        workspaceId: ws.id,
        actorUserId: actor.userId,
        // Q4: actorPlatformRole is non-null here (asserted above) — pass
        // the verified ADMIN identity directly, no placeholder.
        actorPlatformRole,
        actorWorkspaceRole: actor.workspaceRole ?? null,
        entityType: AuditEntityType.WORKSPACE,
        entityId: ws.id,
        action: AuditAction.COMPLEXITY_MODE_CHANGED,
        before: { complexityMode: previousMode },
        after: { complexityMode: mode },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      });
    }
  }
}
