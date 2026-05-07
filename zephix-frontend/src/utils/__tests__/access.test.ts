/**
 * Phase 2A — access utility unit tests
 */
import { describe, it, expect } from 'vitest';
import {
  isPlatformAdmin,
  isPlatformViewer,
  isPlatformMember,
  isWorkspaceOwner,
  isWorkspaceMember,
  isWorkspaceViewer,
  isWorkspaceStoreReadOnlyRole,
  isWorkspaceStoreWriterRole,
  isLegacyOrgDirectoryOwner,
  canSeeCost,
  canSeeWorkspaceOwner,
  canSeeOrgAdmin,
  canManageTemplates,
  canInviteToWorkspace,
  canEditProject,
  canCreateOrgWorkspace,
} from '../access';

describe('access utility', () => {
  // ── Platform role checks ──────────────────────────────────────────
  describe('isPlatformAdmin', () => {
    it('returns true for platformRole ADMIN', () => {
      expect(isPlatformAdmin({ platformRole: 'ADMIN' })).toBe(true);
    });
    it('returns true for legacy role admin', () => {
      expect(isPlatformAdmin({ role: 'admin' })).toBe(true);
    });
    it('returns true for permissions.isAdmin', () => {
      expect(isPlatformAdmin({ permissions: { isAdmin: true } })).toBe(true);
    });
    it('returns false for MEMBER', () => {
      expect(isPlatformAdmin({ platformRole: 'MEMBER' })).toBe(false);
    });
    it('returns false for VIEWER', () => {
      expect(isPlatformAdmin({ platformRole: 'VIEWER' })).toBe(false);
    });
    it('returns false for null user', () => {
      expect(isPlatformAdmin(null)).toBe(false);
    });
  });

  describe('isPlatformViewer', () => {
    it('returns true for VIEWER', () => {
      expect(isPlatformViewer({ platformRole: 'VIEWER' })).toBe(true);
    });
    it('returns false for MEMBER', () => {
      expect(isPlatformViewer({ platformRole: 'MEMBER' })).toBe(false);
    });
    it('returns false for ADMIN', () => {
      expect(isPlatformViewer({ platformRole: 'ADMIN' })).toBe(false);
    });
    it('returns false for null', () => {
      expect(isPlatformViewer(null)).toBe(false);
    });
  });

  describe('isPlatformMember', () => {
    it('returns true for MEMBER', () => {
      expect(isPlatformMember({ platformRole: 'MEMBER' })).toBe(true);
    });
    it('returns false for ADMIN', () => {
      expect(isPlatformMember({ platformRole: 'ADMIN' })).toBe(false);
    });
  });

  describe('canCreateOrgWorkspace', () => {
    it('returns true only for org platform admin', () => {
      expect(canCreateOrgWorkspace({ platformRole: 'ADMIN' })).toBe(true);
    });
    it('returns false for MEMBER even when legacy user.role is admin', () => {
      expect(
        canCreateOrgWorkspace({ platformRole: 'MEMBER', role: 'admin' }),
      ).toBe(false);
    });
    it('returns false for VIEWER', () => {
      expect(canCreateOrgWorkspace({ platformRole: 'VIEWER' })).toBe(false);
    });
  });

  // ── Workspace role checks ─────────────────────────────────────────
  describe('isWorkspaceOwner', () => {
    it('returns true for workspace_owner', () => {
      expect(isWorkspaceOwner('workspace_owner')).toBe(true);
    });
    it('returns false for workspace_member', () => {
      expect(isWorkspaceOwner('workspace_member')).toBe(false);
    });
  });

  describe('isWorkspaceMember', () => {
    it('returns true for workspace_member', () => {
      expect(isWorkspaceMember('workspace_member')).toBe(true);
    });
  });

  describe('isWorkspaceViewer', () => {
    it('returns true for workspace_viewer', () => {
      expect(isWorkspaceViewer('workspace_viewer')).toBe(true);
    });
  });

  describe('isWorkspaceStoreReadOnlyRole', () => {
    it('returns true for stakeholder and workspace_viewer (Zustand store classification)', () => {
      expect(isWorkspaceStoreReadOnlyRole('stakeholder')).toBe(true);
      expect(isWorkspaceStoreReadOnlyRole('workspace_viewer')).toBe(true);
    });
    it('returns false for writable / member / owner roles used in store', () => {
      expect(isWorkspaceStoreReadOnlyRole('workspace_owner')).toBe(false);
      expect(isWorkspaceStoreReadOnlyRole('delivery_owner')).toBe(false);
      expect(isWorkspaceStoreReadOnlyRole('workspace_member')).toBe(false);
    });
    it('returns false for null, undefined, unknown', () => {
      expect(isWorkspaceStoreReadOnlyRole(null)).toBe(false);
      expect(isWorkspaceStoreReadOnlyRole(undefined)).toBe(false);
      expect(isWorkspaceStoreReadOnlyRole('unknown')).toBe(false);
    });
  });

  describe('isWorkspaceStoreWriterRole', () => {
    it('returns true for workspace_owner and delivery_owner only', () => {
      expect(isWorkspaceStoreWriterRole('workspace_owner')).toBe(true);
      expect(isWorkspaceStoreWriterRole('delivery_owner')).toBe(true);
    });
    it('returns false for member, viewer, stakeholder', () => {
      expect(isWorkspaceStoreWriterRole('workspace_member')).toBe(false);
      expect(isWorkspaceStoreWriterRole('workspace_viewer')).toBe(false);
      expect(isWorkspaceStoreWriterRole('stakeholder')).toBe(false);
    });
    it('returns false for null, undefined', () => {
      expect(isWorkspaceStoreWriterRole(null)).toBe(false);
      expect(isWorkspaceStoreWriterRole(undefined)).toBe(false);
    });
  });

  describe('isLegacyOrgDirectoryOwner', () => {
    it('returns true only for legacy directory role owner string', () => {
      expect(isLegacyOrgDirectoryOwner({ role: 'owner' })).toBe(true);
    });
    it('returns false for admin member viewer', () => {
      expect(isLegacyOrgDirectoryOwner({ role: 'admin' })).toBe(false);
      expect(isLegacyOrgDirectoryOwner({ role: 'member' })).toBe(false);
      expect(isLegacyOrgDirectoryOwner({ role: 'viewer' })).toBe(false);
    });
    it('returns false when role uppercase OWNER (directory API ships lowercase)', () => {
      expect(isLegacyOrgDirectoryOwner({ role: 'OWNER' })).toBe(false);
    });
    it('handles missing or null role', () => {
      expect(isLegacyOrgDirectoryOwner({})).toBe(false);
      expect(isLegacyOrgDirectoryOwner({ role: null })).toBe(false);
      expect(isLegacyOrgDirectoryOwner({ role: undefined })).toBe(false);
    });
  });

  // ── Composite permission checks ───────────────────────────────────
  describe('canSeeCost', () => {
    it('returns false for VIEWER (guest)', () => {
      expect(canSeeCost(null, 'VIEWER')).toBe(false);
    });
    it('returns true for MEMBER', () => {
      expect(canSeeCost(null, 'MEMBER')).toBe(true);
    });
    it('returns true for ADMIN', () => {
      expect(canSeeCost(null, 'ADMIN')).toBe(true);
    });
  });

  describe('canSeeWorkspaceOwner', () => {
    it('returns true for platform admin', () => {
      expect(canSeeWorkspaceOwner(null, 'ADMIN')).toBe(true);
    });
    it('returns true for workspace_owner', () => {
      expect(canSeeWorkspaceOwner('workspace_owner', 'MEMBER')).toBe(true);
    });
    it('returns false for workspace_member + MEMBER', () => {
      expect(canSeeWorkspaceOwner('workspace_member', 'MEMBER')).toBe(false);
    });
    it('returns false for VIEWER', () => {
      expect(canSeeWorkspaceOwner('workspace_viewer', 'VIEWER')).toBe(false);
    });
  });

  describe('canSeeOrgAdmin', () => {
    it('returns true for ADMIN', () => {
      expect(canSeeOrgAdmin('ADMIN')).toBe(true);
    });
    it('returns false for MEMBER', () => {
      expect(canSeeOrgAdmin('MEMBER')).toBe(false);
    });
    it('returns false for VIEWER', () => {
      expect(canSeeOrgAdmin('VIEWER')).toBe(false);
    });
  });

  describe('canManageTemplates', () => {
    it('returns true for platform admin', () => {
      expect(canManageTemplates('ADMIN', null)).toBe(true);
    });
    it('returns true for workspace_owner', () => {
      expect(canManageTemplates('MEMBER', 'workspace_owner')).toBe(true);
    });
    it('returns false for workspace_member + MEMBER', () => {
      expect(canManageTemplates('MEMBER', 'workspace_member')).toBe(false);
    });
  });

  describe('canInviteToWorkspace', () => {
    it('returns true for platform admin', () => {
      expect(canInviteToWorkspace(null, 'ADMIN')).toBe(true);
    });
    it('returns true for workspace_owner', () => {
      expect(canInviteToWorkspace('workspace_owner', 'MEMBER')).toBe(true);
    });
    it('returns false for workspace_member', () => {
      expect(canInviteToWorkspace('workspace_member', 'MEMBER')).toBe(false);
    });
  });

  describe('canEditProject', () => {
    it('returns false for VIEWER (guest)', () => {
      expect(canEditProject(null, 'VIEWER')).toBe(false);
    });
    it('returns true for MEMBER', () => {
      expect(canEditProject(null, 'MEMBER')).toBe(true);
    });
    it('returns true for ADMIN', () => {
      expect(canEditProject(null, 'ADMIN')).toBe(true);
    });
  });
});
