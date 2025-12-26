import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { WorkspaceRole } from '../entities/workspace.entity';

export interface BackfillOptions {
  dryRun?: boolean;
  batchSize?: number;
}

export interface BackfillResult {
  workspacesScanned: number;
  workspacesUpdated: number;
  ownerIdChanges: number;
  membersCreated: number;
  membersUpdated: number;
  skipped: Array<{ workspaceId: string; reason: string }>;
  errors: Array<{ workspaceId: string; error: string }>;
}

/**
 * Service for backfilling workspace ownerId and workspace_members data.
 *
 * Rules:
 * 1. If workspace.ownerId is already set and valid → ensure workspace_members row exists
 * 2. If workspace.ownerId is null or invalid → find first org admin, else earliest user
 * 3. Always ensure workspace_members row exists for owner with role 'owner'
 * 4. Idempotent: safe to run multiple times
 */
@Injectable()
export class WorkspaceBackfillService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrgRepo: Repository<UserOrganization>,
    private dataSource: DataSource,
  ) {}

  /**
   * Backfill all workspaces in the database
   */
  async backfillAll(options: BackfillOptions = {}): Promise<BackfillResult> {
    const { dryRun = false, batchSize = 50 } = options;

    const result: BackfillResult = {
      workspacesScanned: 0,
      workspacesUpdated: 0,
      ownerIdChanges: 0,
      membersCreated: 0,
      membersUpdated: 0,
      skipped: [],
      errors: [],
    };

    // Get all organizations
    const orgs = await this.dataSource
      .getRepository('Organization')
      .createQueryBuilder('org')
      .getMany();

    for (const org of orgs) {
      try {
        const orgResult = await this.backfillForOrg(org.id, options);
        result.workspacesScanned += orgResult.workspacesScanned;
        result.workspacesUpdated += orgResult.workspacesUpdated;
        result.ownerIdChanges += orgResult.ownerIdChanges;
        result.membersCreated += orgResult.membersCreated;
        result.membersUpdated += orgResult.membersUpdated;
        result.skipped.push(...orgResult.skipped);
        result.errors.push(...orgResult.errors);
      } catch (error: any) {
        result.errors.push({
          workspaceId: `org-${org.id}`,
          error: `Failed to process organization ${org.id}: ${error.message}`,
        });
      }
    }

    return result;
  }

  /**
   * Backfill workspaces for a specific organization
   */
  async backfillForOrg(
    organizationId: string,
    options: BackfillOptions = {},
  ): Promise<BackfillResult> {
    const { dryRun = false } = options;

    const result: BackfillResult = {
      workspacesScanned: 0,
      workspacesUpdated: 0,
      ownerIdChanges: 0,
      membersCreated: 0,
      membersUpdated: 0,
      skipped: [],
      errors: [],
    };

    // Get all workspaces in this organization (not deleted)
    // TypeORM automatically filters out soft-deleted records when using DeleteDateColumn
    const workspaces = await this.workspaceRepo.find({
      where: {
        organizationId,
      },
      order: { createdAt: 'ASC' },
    });

    result.workspacesScanned = workspaces.length;

    // Get org admins (ordered by joined_at for deterministic selection)
    const orgAdmins = await this.userOrgRepo
      .createQueryBuilder('uo')
      .where('uo.organizationId = :orgId', { orgId: organizationId })
      .andWhere('uo.isActive = :isActive', { isActive: true })
      .andWhere('uo.role = :role', { role: 'admin' })
      .orderBy('uo.joinedAt', 'ASC')
      .addOrderBy('uo.createdAt', 'ASC')
      .getMany();

    // Also get owners (higher priority)
    const orgOwners = await this.userOrgRepo
      .createQueryBuilder('uo')
      .where('uo.organizationId = :orgId', { orgId: organizationId })
      .andWhere('uo.isActive = :isActive', { isActive: true })
      .andWhere('uo.role = :role', { role: 'owner' })
      .orderBy('uo.joinedAt', 'ASC')
      .addOrderBy('uo.createdAt', 'ASC')
      .getMany();

    // Fallback: get earliest user in org if no admin/owner
    const earliestUser = await this.userOrgRepo
      .createQueryBuilder('uo')
      .where('uo.organizationId = :orgId', { orgId: organizationId })
      .andWhere('uo.isActive = :isActive', { isActive: true })
      .orderBy('uo.joinedAt', 'ASC')
      .addOrderBy('uo.createdAt', 'ASC')
      .getOne();

    // Determine default owner candidate
    let defaultOwnerId: string | null = null;
    if (orgOwners.length > 0) {
      defaultOwnerId = orgOwners[0].userId;
    } else if (orgAdmins.length > 0) {
      defaultOwnerId = orgAdmins[0].userId;
    } else if (earliestUser) {
      defaultOwnerId = earliestUser.userId;
    }

    // Process each workspace
    for (const workspace of workspaces) {
      try {
        const workspaceResult = await this.backfillWorkspace(
          workspace,
          defaultOwnerId,
          dryRun,
        );

        if (workspaceResult.ownerIdChanged) {
          result.ownerIdChanges++;
        }
        if (workspaceResult.memberCreated) {
          result.membersCreated++;
        }
        if (workspaceResult.memberUpdated) {
          result.membersUpdated++;
        }
        if (workspaceResult.updated) {
          result.workspacesUpdated++;
        }
        if (workspaceResult.skipped) {
          result.skipped.push({
            workspaceId: workspace.id,
            reason: workspaceResult.skipReason || 'Unknown',
          });
        }
      } catch (error: any) {
        result.errors.push({
          workspaceId: workspace.id,
          error: error.message || String(error),
        });
      }
    }

    return result;
  }

  /**
   * Backfill a single workspace
   */
  async backfillWorkspace(
    workspace: Workspace,
    defaultOwnerId: string | null,
    dryRun: boolean = false,
  ): Promise<{
    updated: boolean;
    ownerIdChanged: boolean;
    memberCreated: boolean;
    memberUpdated: boolean;
    skipped: boolean;
    skipReason?: string;
  }> {
    let updated = false;
    let ownerIdChanged = false;
    let memberCreated = false;
    let memberUpdated = false;

    // Use query runner for transaction support
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Determine desired ownerId
      let desiredOwnerId: string | null = null;

      // Check if current ownerId is valid
      if (workspace.ownerId) {
        const ownerUser = await this.userRepo.findOne({
          where: { id: workspace.ownerId },
        });

        if (
          ownerUser &&
          ownerUser.organizationId === workspace.organizationId
        ) {
          // Current ownerId is valid
          desiredOwnerId = workspace.ownerId;
        } else {
          // Current ownerId is invalid (user doesn't exist or wrong org)
          desiredOwnerId = defaultOwnerId;
        }
      } else {
        // No ownerId set
        desiredOwnerId = defaultOwnerId;
      }

      // If no candidate owner found, skip
      if (!desiredOwnerId) {
        await queryRunner.rollbackTransaction();
        return {
          updated: false,
          ownerIdChanged: false,
          memberCreated: false,
          memberUpdated: false,
          skipped: true,
          skipReason: 'No eligible users found in organization',
        };
      }

      // Step 2: Update ownerId if needed
      if (workspace.ownerId !== desiredOwnerId) {
        if (!dryRun) {
          await queryRunner.manager.update(
            Workspace,
            { id: workspace.id },
            { ownerId: desiredOwnerId },
          );
          ownerIdChanged = true;
          updated = true;
        } else {
          ownerIdChanged = true;
          updated = true;
        }
      }

      // Step 3: Ensure workspace_members row exists for owner
      const existingMember = await queryRunner.manager.findOne(
        WorkspaceMember,
        {
          where: {
            workspaceId: workspace.id,
            userId: desiredOwnerId,
          },
        },
      );

      if (!existingMember) {
        // Create new member record
        if (!dryRun) {
          const newMember = queryRunner.manager.create(WorkspaceMember, {
            workspaceId: workspace.id,
            userId: desiredOwnerId,
            role: 'workspace_owner' as WorkspaceRole,
          });
          await queryRunner.manager.save(newMember);
          memberCreated = true;
          updated = true;
        } else {
          memberCreated = true;
          updated = true;
        }
      } else if (existingMember.role !== 'workspace_owner') {
        // Update existing member to workspace_owner role
        if (!dryRun) {
          existingMember.role = 'workspace_owner' as WorkspaceRole;
          await queryRunner.manager.save(existingMember);
          memberUpdated = true;
          updated = true;
        } else {
          memberUpdated = true;
          updated = true;
        }
      }

      if (!dryRun) {
        await queryRunner.commitTransaction();
      } else {
        await queryRunner.rollbackTransaction();
      }

      return {
        updated,
        ownerIdChanged,
        memberCreated,
        memberUpdated,
        skipped: false,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
