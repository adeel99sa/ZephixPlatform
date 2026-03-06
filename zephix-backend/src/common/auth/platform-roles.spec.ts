/**
 * Regression tests for canonical platform-roles module.
 * These guard against regressions in the single source of truth for RBAC role resolution.
 */
import {
  PlatformRole,
  normalizePlatformRole,
  resolvePlatformRoleFromRequestUser,
  isAdminPlatformRole,
  isMemberPlatformRole,
  isViewerPlatformRole,
  isAdminRole,
  canCreateWorkspaces,
} from './platform-roles';

describe('canonical platform-roles', () => {
  describe('normalizePlatformRole', () => {
    it('defaults to VIEWER for null/undefined/empty', () => {
      expect(normalizePlatformRole(null)).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole(undefined)).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('')).toBe(PlatformRole.VIEWER);
    });

    it('handles already-normalized uppercase values', () => {
      expect(normalizePlatformRole('ADMIN')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('MEMBER')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('VIEWER')).toBe(PlatformRole.VIEWER);
    });

    it('maps admin legacy values → ADMIN', () => {
      expect(normalizePlatformRole('admin')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('owner')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('administrator')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('OWNER')).toBe(PlatformRole.ADMIN);
    });

    it('maps member legacy values → MEMBER', () => {
      expect(normalizePlatformRole('member')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('pm')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('project_manager')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('manager')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('PM')).toBe(PlatformRole.MEMBER);
    });

    it('maps viewer legacy values → VIEWER', () => {
      expect(normalizePlatformRole('viewer')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('guest')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('GUEST')).toBe(PlatformRole.VIEWER);
    });

    it('defaults unknown role to VIEWER (safe write-block default)', () => {
      expect(normalizePlatformRole('unknown')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('superuser')).toBe(PlatformRole.VIEWER);
    });
  });

  describe('resolvePlatformRoleFromRequestUser', () => {
    it('prefers platformRole over role', () => {
      expect(resolvePlatformRoleFromRequestUser({ platformRole: 'ADMIN', role: 'member' })).toBe(PlatformRole.ADMIN);
    });

    it('falls back to role when platformRole is absent', () => {
      expect(resolvePlatformRoleFromRequestUser({ role: 'member' })).toBe(PlatformRole.MEMBER);
    });

    it('falls back to role when platformRole is null', () => {
      expect(resolvePlatformRoleFromRequestUser({ platformRole: null, role: 'admin' })).toBe(PlatformRole.ADMIN);
    });

    it('returns VIEWER for null user', () => {
      expect(resolvePlatformRoleFromRequestUser(null)).toBe(PlatformRole.VIEWER);
      expect(resolvePlatformRoleFromRequestUser(undefined)).toBe(PlatformRole.VIEWER);
    });

    it('returns VIEWER for user with no role fields', () => {
      expect(resolvePlatformRoleFromRequestUser({})).toBe(PlatformRole.VIEWER);
    });

    it('VIEWER-platformRole takes precedence over ADMIN role — prevents privilege escalation via legacy field', () => {
      expect(resolvePlatformRoleFromRequestUser({ platformRole: 'VIEWER', role: 'admin' })).toBe(PlatformRole.VIEWER);
    });

    it('normalizes legacy platformRole values', () => {
      expect(resolvePlatformRoleFromRequestUser({ platformRole: 'owner' })).toBe(PlatformRole.ADMIN);
      expect(resolvePlatformRoleFromRequestUser({ platformRole: 'pm' })).toBe(PlatformRole.MEMBER);
    });
  });

  describe('isAdminPlatformRole / isAdminRole (alias)', () => {
    it('returns true for ADMIN', () => {
      expect(isAdminPlatformRole(PlatformRole.ADMIN)).toBe(true);
      expect(isAdminPlatformRole('ADMIN')).toBe(true);
      expect(isAdminPlatformRole('admin')).toBe(true);
      expect(isAdminPlatformRole('owner')).toBe(true);
    });

    it('returns false for MEMBER, VIEWER, null, unknown', () => {
      expect(isAdminPlatformRole(PlatformRole.MEMBER)).toBe(false);
      expect(isAdminPlatformRole(PlatformRole.VIEWER)).toBe(false);
      expect(isAdminPlatformRole(null)).toBe(false);
      expect(isAdminPlatformRole(undefined)).toBe(false);
      expect(isAdminPlatformRole('unknown')).toBe(false);
    });

    it('isAdminRole is an alias with identical behavior', () => {
      expect(isAdminRole('ADMIN')).toBe(isAdminPlatformRole('ADMIN'));
      expect(isAdminRole('MEMBER')).toBe(isAdminPlatformRole('MEMBER'));
      expect(isAdminRole('VIEWER')).toBe(isAdminPlatformRole('VIEWER'));
    });
  });

  describe('isMemberPlatformRole', () => {
    it('returns true for MEMBER', () => {
      expect(isMemberPlatformRole(PlatformRole.MEMBER)).toBe(true);
      expect(isMemberPlatformRole('MEMBER')).toBe(true);
      expect(isMemberPlatformRole('member')).toBe(true);
    });

    it('returns false for ADMIN, VIEWER, null', () => {
      expect(isMemberPlatformRole(PlatformRole.ADMIN)).toBe(false);
      expect(isMemberPlatformRole(PlatformRole.VIEWER)).toBe(false);
      expect(isMemberPlatformRole(null)).toBe(false);
    });
  });

  describe('isViewerPlatformRole', () => {
    it('returns true for VIEWER', () => {
      expect(isViewerPlatformRole(PlatformRole.VIEWER)).toBe(true);
      expect(isViewerPlatformRole('VIEWER')).toBe(true);
      expect(isViewerPlatformRole('viewer')).toBe(true);
      expect(isViewerPlatformRole('guest')).toBe(true);
    });

    it('returns false for ADMIN, MEMBER', () => {
      expect(isViewerPlatformRole(PlatformRole.ADMIN)).toBe(false);
      expect(isViewerPlatformRole(PlatformRole.MEMBER)).toBe(false);
    });
  });

  describe('canCreateWorkspaces', () => {
    it('returns true only for ADMIN', () => {
      expect(canCreateWorkspaces(PlatformRole.ADMIN)).toBe(true);
      expect(canCreateWorkspaces('admin')).toBe(true);
      expect(canCreateWorkspaces('owner')).toBe(true);
    });

    it('returns false for MEMBER, VIEWER, null', () => {
      expect(canCreateWorkspaces(PlatformRole.MEMBER)).toBe(false);
      expect(canCreateWorkspaces(PlatformRole.VIEWER)).toBe(false);
      expect(canCreateWorkspaces(null)).toBe(false);
    });
  });
});
