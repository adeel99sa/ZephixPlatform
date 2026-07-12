import { ForbiddenException } from '@nestjs/common';
import { WorkspaceRoleGuardService } from '../workspace-role-guard.service';
import { WorkspaceRole } from '../../workspaces/entities/workspace.entity';

/**
 * WA-1 — workspace write authorization matrix.
 *
 * Tasks are execution → workspace_owner + workspace_member (requireWorkspaceTaskWrite).
 * Structure/governance stays owner-only (requireWorkspaceWrite).
 * The vestigial project-scoped roles (delivery_owner/stakeholder) grant nothing.
 */
describe('WorkspaceRoleGuardService (WA-1)', () => {
  let service: WorkspaceRoleGuardService;
  let memberRepo: { findOne: jest.Mock };
  const tenantContext = { assertOrganizationId: jest.fn(() => 'org-1') } as any;

  const withRole = (role: WorkspaceRole | null) => {
    memberRepo.findOne.mockResolvedValue(role ? { role } : null);
  };

  beforeEach(() => {
    memberRepo = { findOne: jest.fn() };
    service = new WorkspaceRoleGuardService(memberRepo as any, tenantContext);
  });

  describe('requireWorkspaceTaskWrite (task CRUD)', () => {
    it('allows workspace_owner', async () => {
      withRole('workspace_owner');
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).resolves.toBeUndefined();
    });

    it('allows workspace_member', async () => {
      withRole('workspace_member');
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).resolves.toBeUndefined();
    });

    it('rejects workspace_viewer (read-only)', async () => {
      withRole('workspace_viewer');
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a non-member', async () => {
      withRole(null);
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects the vestigial delivery_owner / stakeholder roles', async () => {
      withRole('delivery_owner');
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).rejects.toThrow(ForbiddenException);
      withRole('stakeholder');
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('requireWorkspaceWrite (structure/governance — owner-only, ghost removed)', () => {
    it('allows workspace_owner', async () => {
      withRole('workspace_owner');
      await expect(
        service.requireWorkspaceWrite('ws-1', 'u-1'),
      ).resolves.toBeUndefined();
    });

    it('rejects workspace_member (members must NOT get structure powers)', async () => {
      withRole('workspace_member');
      await expect(service.requireWorkspaceWrite('ws-1', 'u-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects the ghost delivery_owner (WA-1 removed it from the allowlist)', async () => {
      withRole('delivery_owner');
      await expect(service.requireWorkspaceWrite('ws-1', 'u-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects workspace_viewer and non-members', async () => {
      withRole('workspace_viewer');
      await expect(service.requireWorkspaceWrite('ws-1', 'u-1')).rejects.toThrow(
        ForbiddenException,
      );
      withRole(null);
      await expect(service.requireWorkspaceWrite('ws-1', 'u-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('separation invariant', () => {
    it('workspace_member gets task-write but NOT structure-write', async () => {
      withRole('workspace_member');
      await expect(
        service.requireWorkspaceTaskWrite('ws-1', 'u-1'),
      ).resolves.toBeUndefined();
      withRole('workspace_member');
      await expect(service.requireWorkspaceWrite('ws-1', 'u-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
