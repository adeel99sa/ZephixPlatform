import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { WorkspaceMembersController } from './workspace-members.controller';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { WorkspaceInvitationsService } from '../../auth/services/workspace-invitations.service';
import { AuthRequest } from '../../../common/http/auth-request';

/**
 * WorkspaceMembersController authorization tests, focused on the
 * zero-member workspace edge case (PR1 deviation 2 follow-up).
 *
 * Specifically asserts that:
 *   • Org admins CAN manage a workspace that has no members yet (the gap
 *     called out in PR1's AuthorizationService limitation).
 *   • Non-admin callers facing the same zero-member workspace get 403,
 *     not a leak of workspace existence beyond what the org-admin path
 *     would already reveal.
 *
 * Controller is thin orchestration over repos + WorkspaceInvitationsService;
 * we mock the repo layer and call the controller's public methods directly.
 */
describe('WorkspaceMembersController — authorization', () => {
  const ORG_A = '00000000-0000-0000-0000-0000000000aa';
  const ORG_B = '00000000-0000-0000-0000-0000000000bb';
  const WORKSPACE_A1 = '00000000-0000-0000-0000-000000000a01';
  const WORKSPACE_A_EMPTY = '00000000-0000-0000-0000-000000000aff';
  const ADMIN_USER = '00000000-0000-0000-0000-000000000001';
  const OWNER_USER = '00000000-0000-0000-0000-000000000002';
  const MEMBER_USER = '00000000-0000-0000-0000-000000000003';
  const STRANGER = '00000000-0000-0000-0000-000000000099';

  let controller: WorkspaceMembersController;
  let workspaceRepo: InMemoryWorkspaceRepository;
  let memberRepo: InMemoryWorkspaceMemberRepository;
  let userRepo: InMemoryUserRepository;
  let userOrgRepo: InMemoryUserOrgRepository;
  let workspaceInvites: jest.Mocked<
    Pick<WorkspaceInvitationsService, 'createInvitation'>
  >;

  const buildReq = (
    userId: string,
    platformRole: string | null = null,
  ): AuthRequest =>
    ({
      user: {
        id: userId,
        organizationId: ORG_A,
        platformRole,
      },
    }) as unknown as AuthRequest;

  beforeEach(() => {
    workspaceRepo = new InMemoryWorkspaceRepository();
    memberRepo = new InMemoryWorkspaceMemberRepository();
    userRepo = new InMemoryUserRepository();
    userOrgRepo = new InMemoryUserOrgRepository();
    workspaceInvites = { createInvitation: jest.fn() };

    // Seed: workspaces in ORG_A
    workspaceRepo.seed({ id: WORKSPACE_A1, organizationId: ORG_A, name: 'WS-A1' });
    workspaceRepo.seed({
      id: WORKSPACE_A_EMPTY,
      organizationId: ORG_A,
      name: 'WS-A-empty',
    });

    // Seed memberships in WORKSPACE_A1
    memberRepo.seed({
      id: 'wm-1',
      workspaceId: WORKSPACE_A1,
      organizationId: ORG_A,
      userId: OWNER_USER,
      role: 'workspace_owner',
      status: 'active',
    });
    memberRepo.seed({
      id: 'wm-2',
      workspaceId: WORKSPACE_A1,
      organizationId: ORG_A,
      userId: MEMBER_USER,
      role: 'workspace_member',
      status: 'active',
    });
    // WORKSPACE_A_EMPTY has zero members — that's the edge case under test

    // Seed user_organizations for the actors
    userOrgRepo.seed({
      userId: ADMIN_USER,
      organizationId: ORG_A,
      role: 'admin',
      isActive: true,
    });
    userOrgRepo.seed({
      userId: OWNER_USER,
      organizationId: ORG_A,
      role: 'member',
      isActive: true,
    });
    userOrgRepo.seed({
      userId: MEMBER_USER,
      organizationId: ORG_A,
      role: 'member',
      isActive: true,
    });
    // STRANGER has no row for ORG_A

    controller = new WorkspaceMembersController(
      workspaceRepo as unknown as Repository<Workspace>,
      memberRepo as unknown as Repository<WorkspaceMember>,
      userRepo as unknown as Repository<User>,
      userOrgRepo as unknown as Repository<UserOrganization>,
      workspaceInvites as unknown as WorkspaceInvitationsService,
    );
  });

  describe('zero-member workspace edge case (PR1 deviation 2)', () => {
    it('org admin CAN list members of a workspace with zero members', async () => {
      const result = await controller.list(
        buildReq(ADMIN_USER, 'ADMIN'),
        WORKSPACE_A_EMPTY,
      );
      expect(result).toEqual({ members: [] });
    });

    it('org admin CAN invite a new member to a workspace with zero members', async () => {
      workspaceInvites.createInvitation.mockResolvedValue({
        invitationId: 'inv-1',
        email: 'first@example.com',
        expiresAt: new Date('2026-06-01T00:00:00Z'),
      });

      const result = await controller.invite(
        buildReq(ADMIN_USER, 'ADMIN'),
        WORKSPACE_A_EMPTY,
        {
          email: 'first@example.com',
          workspaceRole: 'workspace_owner',
        },
      );

      expect(workspaceInvites.createInvitation).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_A_EMPTY,
        email: 'first@example.com',
        role: 'workspace_owner',
        invitedBy: ADMIN_USER,
      });
      expect(result.invitationId).toBe('inv-1');
    });

    it('non-admin org member CANNOT list a zero-member workspace (403)', async () => {
      await expect(
        controller.list(buildReq(MEMBER_USER), WORKSPACE_A_EMPTY),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
        }),
      });
    });

    it('non-admin org member CANNOT invite into a zero-member workspace', async () => {
      await expect(
        controller.invite(buildReq(MEMBER_USER), WORKSPACE_A_EMPTY, {
          email: 'first@example.com',
          workspaceRole: 'workspace_member',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(workspaceInvites.createInvitation).not.toHaveBeenCalled();
    });
  });

  describe('regular workspace authorization', () => {
    it('workspace owner CAN list members of own workspace', async () => {
      const result = await controller.list(buildReq(OWNER_USER), WORKSPACE_A1);
      expect(result.members).toHaveLength(0); // user relations not seeded; structural OK
    });

    it('workspace member (not owner) CANNOT list (403)', async () => {
      await expect(
        controller.list(buildReq(MEMBER_USER), WORKSPACE_A1),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
        }),
      });
    });

    it('stranger with no org membership in the workspace’s org CANNOT manage (403)', async () => {
      await expect(
        controller.list(buildReq(STRANGER), WORKSPACE_A1),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns 404 WORKSPACE_NOT_FOUND for unknown workspace id', async () => {
      const fakeWsId = '99999999-9999-9999-9999-999999999999';
      await expect(
        controller.list(buildReq(ADMIN_USER, 'ADMIN'), fakeWsId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'WORKSPACE_NOT_FOUND' }),
      });
    });

    it('cross-org admin (admin in ORG_B) CANNOT manage workspace in ORG_A', async () => {
      // Wipe ADMIN_USER's ORG_A membership and give them ORG_B admin
      userOrgRepo.rows.length = 0;
      userOrgRepo.seed({
        userId: ADMIN_USER,
        organizationId: ORG_B,
        role: 'admin',
        isActive: true,
      });

      await expect(
        controller.list(buildReq(ADMIN_USER, 'ADMIN'), WORKSPACE_A1),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('change-role / remove', () => {
    it('admin can change role of an existing member', async () => {
      const result = await controller.changeRole(
        buildReq(ADMIN_USER, 'ADMIN'),
        WORKSPACE_A1,
        MEMBER_USER,
        { workspaceRole: 'workspace_owner' },
      );
      expect(result.userId).toBe(MEMBER_USER);
      expect(result.workspaceRole).toBe('workspace_owner');
    });

    it('admin can remove an existing member (returns void)', async () => {
      const result = await controller.remove(
        buildReq(ADMIN_USER, 'ADMIN'),
        WORKSPACE_A1,
        MEMBER_USER,
      );
      expect(result).toBeUndefined();
      expect(memberRepo.findRow({ workspaceId: WORKSPACE_A1, userId: MEMBER_USER })).toBeNull();
    });

    it('change-role on non-member returns 404 MEMBER_NOT_FOUND', async () => {
      await expect(
        controller.changeRole(
          buildReq(ADMIN_USER, 'ADMIN'),
          WORKSPACE_A1,
          STRANGER,
          { workspaceRole: 'workspace_member' },
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'MEMBER_NOT_FOUND' }),
      });
    });

    it('remove on non-member returns 404 MEMBER_NOT_FOUND', async () => {
      await expect(
        controller.remove(
          buildReq(ADMIN_USER, 'ADMIN'),
          WORKSPACE_A1,
          STRANGER,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

// ─── Test harness ────────────────────────────────────────────────────────

class InMemoryWorkspaceRepository {
  private rows: any[] = [];
  seed(row: any) {
    this.rows.push(row);
  }
  async findOne(opts: { where: { id: string } }): Promise<any | null> {
    return this.rows.find((r) => r.id === opts.where.id) ?? null;
  }
}

class InMemoryWorkspaceMemberRepository {
  rows: any[] = [];
  seed(row: any) {
    this.rows.push(row);
  }

  async find(opts: { where: any; relations?: string[] }): Promise<any[]> {
    const ws = opts.where.workspaceId;
    return this.rows.filter((r) => r.workspaceId === ws);
  }

  async findOne(opts: {
    where: { workspaceId: string; userId: string };
  }): Promise<any | null> {
    return (
      this.rows.find(
        (r) =>
          r.workspaceId === opts.where.workspaceId &&
          r.userId === opts.where.userId,
      ) ?? null
    );
  }

  /** Synchronous test-only helper; named distinctly to avoid clashing with the async repo find(). */
  findRow(filter: { workspaceId: string; userId: string }) {
    return (
      this.rows.find(
        (r) =>
          r.workspaceId === filter.workspaceId &&
          r.userId === filter.userId,
      ) ?? null
    );
  }

  async save(entity: any): Promise<any> {
    const idx = this.rows.findIndex((r) => r.id === entity.id);
    if (idx >= 0) {
      this.rows[idx] = { ...this.rows[idx], ...entity };
      return this.rows[idx];
    }
    this.rows.push(entity);
    return entity;
  }

  async delete(id: string): Promise<{ affected: number }> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) return { affected: 0 };
    this.rows.splice(idx, 1);
    return { affected: 1 };
  }
}

class InMemoryUserRepository {
  private rows: any[] = [];
  async findOne(_opts: any): Promise<any | null> {
    return this.rows[0] ?? null;
  }
}

class InMemoryUserOrgRepository {
  rows: any[] = [];
  seed(row: any) {
    this.rows.push(row);
  }
  async findOne(opts: { where: any }): Promise<any | null> {
    const w = opts.where;
    return (
      this.rows.find(
        (r) =>
          r.userId === w.userId &&
          r.organizationId === w.organizationId &&
          (w.isActive === undefined || r.isActive === w.isActive),
      ) ?? null
    );
  }
}
