import { PlatformRole, normalizePlatformRole, isAdminRole, canCreateWorkspaces } from './platform-roles.enum';

describe('PlatformRole', () => {
  describe('normalizePlatformRole', () => {
    it('should return VIEWER for null or undefined', () => {
      expect(normalizePlatformRole(null)).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole(undefined)).toBe(PlatformRole.VIEWER);
    });

    it('should return PlatformRole for uppercase values', () => {
      expect(normalizePlatformRole('ADMIN')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('MEMBER')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('VIEWER')).toBe(PlatformRole.VIEWER);
    });

    it('should normalize legacy owner/admin to ADMIN', () => {
      expect(normalizePlatformRole('owner')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('admin')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('OWNER')).toBe(PlatformRole.ADMIN);
      expect(normalizePlatformRole('ADMIN')).toBe(PlatformRole.ADMIN);
    });

    it('should normalize legacy pm/member/project_manager to MEMBER', () => {
      expect(normalizePlatformRole('pm')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('member')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('project_manager')).toBe(PlatformRole.MEMBER);
      expect(normalizePlatformRole('PM')).toBe(PlatformRole.MEMBER);
    });

    it('should normalize legacy guest/viewer to VIEWER', () => {
      expect(normalizePlatformRole('guest')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('viewer')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('GUEST')).toBe(PlatformRole.VIEWER);
    });

    it('should fall back to VIEWER for unknown roles', () => {
      expect(normalizePlatformRole('unknown')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('random')).toBe(PlatformRole.VIEWER);
      expect(normalizePlatformRole('')).toBe(PlatformRole.VIEWER);
    });
  });

  describe('isAdminRole', () => {
    it('should return true for ADMIN role', () => {
      expect(isAdminRole(PlatformRole.ADMIN)).toBe(true);
      expect(isAdminRole('ADMIN')).toBe(true);
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('owner')).toBe(true);
    });

    it('should return false for MEMBER and VIEWER', () => {
      expect(isAdminRole(PlatformRole.MEMBER)).toBe(false);
      expect(isAdminRole(PlatformRole.VIEWER)).toBe(false);
      expect(isAdminRole('member')).toBe(false);
      expect(isAdminRole('viewer')).toBe(false);
    });
  });

  describe('canCreateWorkspaces', () => {
    it('should return true only for ADMIN', () => {
      expect(canCreateWorkspaces(PlatformRole.ADMIN)).toBe(true);
      expect(canCreateWorkspaces('admin')).toBe(true);
      expect(canCreateWorkspaces('owner')).toBe(true);
    });

    it('should return false for MEMBER and VIEWER', () => {
      expect(canCreateWorkspaces(PlatformRole.MEMBER)).toBe(false);
      expect(canCreateWorkspaces(PlatformRole.VIEWER)).toBe(false);
      expect(canCreateWorkspaces('member')).toBe(false);
      expect(canCreateWorkspaces('viewer')).toBe(false);
    });
  });
});




