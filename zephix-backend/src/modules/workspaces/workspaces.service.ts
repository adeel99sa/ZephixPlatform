import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';

const DEFAULT_RETENTION_DAYS = Number(process.env.TRASH_RETENTION_DAYS ?? 30); // admin can change later

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private repo: TenantAwareRepository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private memberRepo: TenantAwareRepository<WorkspaceMember>,
    private configService: ConfigService,
    private dataSource: DataSource,
    private readonly tenantContextService: TenantContextService,
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

  async getById(organizationId: string, id: string) {
    try {
      // organizationId parameter kept for backward compatibility
      // TenantAwareRepository automatically scopes by organizationId from context
      const ws = await this.repo.findOne({ where: { id } });
      // Return null if not found (controller will handle response format)
      return ws || null;
    } catch (error) {
      // Never throw - return null on any error
      return null;
    }
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
    return this.dataSource.transaction(async (manager) => {
      const workspaceRepo = manager.getRepository(Workspace);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      // Validate owner user exists and is in the organization
      const ownerUser = await userRepo.findOne({
        where: { id: input.ownerId },
      });

      if (!ownerUser) {
        throw new NotFoundException('Owner user not found');
      }

      const userOrg = await userOrgRepo.findOne({
        where: {
          userId: input.ownerId,
          organizationId: input.organizationId,
          isActive: true,
        },
      });

      // Dev mode: if user's organizationId matches, allow even without UserOrganization record
      const isDev = process.env.NODE_ENV !== 'production';
      if (
        !userOrg &&
        isDev &&
        ownerUser.organizationId === input.organizationId
      ) {
        // Auto-create UserOrganization in dev mode for testing
        // Map user role to UserOrganization role enum
        const roleMapping: Record<string, 'owner' | 'admin' | 'pm' | 'viewer'> =
          {
            owner: 'owner',
            admin: 'admin',
            member: 'pm',
            pm: 'pm',
            guest: 'viewer',
            viewer: 'viewer',
          };
        const orgRole = roleMapping[ownerUser.role || 'viewer'] || 'viewer';

        const newUserOrg = userOrgRepo.create({
          userId: input.ownerId,
          organizationId: input.organizationId,
          isActive: true,
          role: orgRole,
        });
        await userOrgRepo.save(newUserOrg);
      } else if (!userOrg) {
        throw new ForbiddenException(
          'Owner user must be an active member of the organization. Only existing organization users can be workspace owners.',
        );
      }

      const entity = workspaceRepo.create({
        name: input.name,
        slug: input.slug,
        description: input.description,
        defaultMethodology: input.defaultMethodology,
        isPrivate: !!input.isPrivate,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        ownerId: input.ownerId,
      });
      const savedWorkspace = await workspaceRepo.save(entity);

      const member = memberRepo.create({
        workspaceId: savedWorkspace.id,
        userId: input.ownerId,
        role: 'workspace_owner',
        createdBy: input.createdBy,
      });
      await memberRepo.save(member);

      // Structured logging for workspace creation
      // Note: This should be called from controller with full context
      // Including here for completeness, but controller should also log
      console.log(
        JSON.stringify({
          event: 'workspace.created',
          level: 'info',
          organizationId: input.organizationId,
          workspaceId: savedWorkspace.id,
          creatorUserId: input.createdBy,
          creatorPlatformRole: userOrg?.role || 'unknown', // Will be normalized by guard
          createdAsWorkspaceRole: 'workspace_owner',
          workspaceName: savedWorkspace.name,
          timestamp: new Date().toISOString(),
        }),
      );

      return savedWorkspace;
    });
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
