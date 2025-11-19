import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, DataSource } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';

const DEFAULT_RETENTION_DAYS = Number(process.env.TRASH_RETENTION_DAYS ?? 30); // admin can change later

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace) private repo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private memberRepo: Repository<WorkspaceMember>,
    private configService: ConfigService,
    private dataSource: DataSource,
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
  async listByOrg(organizationId: string, userId?: string, userRole?: string) {
    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // If feature flag disabled or user is admin, return all org workspaces
    if (!featureEnabled || userRole === 'admin' || userRole === 'owner') {
      const useRaw = process.env.USE_RAW_SOFT_DELETE_QUERIES === 'true';

      if (useRaw) {
        return this.repo.query(
          `SELECT * FROM workspaces
           WHERE organization_id = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC`,
          [organizationId],
        );
      }

      return this.repo.find({
        where: { organizationId },
        order: { createdAt: 'DESC' },
      });
    }

    // Feature enabled and user is not admin - filter by workspace membership
    if (!userId) {
      return []; // Non-admin without userId sees nothing
    }

    // Get workspaces where user is a member
    const memberWorkspaces = await this.memberRepo.find({
      where: { userId },
      relations: ['workspace'],
    });

    const workspaceIds = memberWorkspaces
      .map((m) => m.workspace?.id)
      .filter((id): id is string => !!id);

    if (workspaceIds.length === 0) {
      return [];
    }

    const useRaw = process.env.USE_RAW_SOFT_DELETE_QUERIES === 'true';

    if (useRaw) {
      return this.repo.query(
        `SELECT * FROM workspaces
         WHERE organization_id = $1
         AND id = ANY($2::uuid[])
         AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [organizationId, workspaceIds],
      );
    }

    // Use query builder for IN clause
    return this.repo
      .createQueryBuilder('w')
      .where('w.organizationId = :organizationId', { organizationId })
      .andWhere('w.id IN (:...workspaceIds)', { workspaceIds })
      .andWhere('w.deletedAt IS NULL')
      .orderBy('w.createdAt', 'DESC')
      .getMany();
  }

  async getById(organizationId: string, id: string) {
    const ws = await this.repo.findOne({ where: { id, organizationId } });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
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
      const result = await this.repo.query(
        `INSERT INTO workspaces (id, name, slug, description, is_private, organization_id, created_by, owner_id, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          input.name,
          input.slug,
          null,
          !!input.isPrivate,
          input.organizationId,
          input.createdBy,
          input.ownerId || null,
        ],
      );
      return result[0];
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

      if (!userOrg) {
        throw new ForbiddenException(
          'Owner user must be an active member of the organization. Only existing organization users can be workspace owners.',
        );
      }

      const entity = workspaceRepo.create({
        name: input.name,
        slug: input.slug,
        isPrivate: !!input.isPrivate,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        ownerId: input.ownerId,
      });
      const savedWorkspace = await workspaceRepo.save(entity);

      const member = memberRepo.create({
        workspaceId: savedWorkspace.id,
        userId: input.ownerId,
        role: 'owner',
        createdBy: input.createdBy,
      });
      await memberRepo.save(member);

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
      return this.repo.query(
        `SELECT * FROM workspaces
         WHERE organization_id = $1 AND deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`,
        [organizationId],
      );
    }

    return this.repo
      .createQueryBuilder('w')
      .withDeleted() // ✅ include soft-deleted rows in scope
      .where('w.organization_id = :orgId', { orgId: organizationId })
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
