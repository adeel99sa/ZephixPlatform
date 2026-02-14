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
  canSeeCost,
  canSeeWorkspaceAdmin,
  canSeeOrgAdmin,
  canManageTemplates,
  canInviteToWorkspace,
  canEditProject,
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

  describe('canSeeWorkspaceAdmin', () => {
    it('returns true for platform admin', () => {
      expect(canSeeWorkspaceAdmin(null, 'ADMIN')).toBe(true);
    });
    it('returns true for workspace_owner', () => {
      expect(canSeeWorkspaceAdmin('workspace_owner', 'MEMBER')).toBe(true);
    });
    it('returns false for workspace_member + MEMBER', () => {
      expect(canSeeWorkspaceAdmin('workspace_member', 'MEMBER')).toBe(false);
    });
    it('returns false for VIEWER', () => {
      expect(canSeeWorkspaceAdmin('workspace_viewer', 'VIEWER')).toBe(false);
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
