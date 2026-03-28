import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireOrgRoleGuard } from './require-org-role.guard';
import { PlatformRole } from '../../../common/auth/platform-roles';

describe('RequireOrgRoleGuard', () => {
  let guard: RequireOrgRoleGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RequireOrgRoleGuard(reflector);

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: null,
        }),
      }),
      getHandler: jest.fn(),
    } as any;
  });

  describe('when no role requirement', () => {
    it('should allow access', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'MEMBER',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('when user is not authenticated', () => {
    it('should throw ForbiddenException', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(PlatformRole.ADMIN);
      mockContext.switchToHttp().getRequest().user = null;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Authentication required');
    });
  });

  describe('when requiring ADMIN role', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockReturnValue(PlatformRole.ADMIN);
    });

    it('should allow ADMIN user via platformRole', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        platformRole: 'ADMIN',
        role: 'admin',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow ADMIN user via role fallback when platformRole absent', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'ADMIN',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow legacy admin/owner roles', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'admin', // Legacy lowercase
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny MEMBER via platformRole even when role field is admin (critical regression)', () => {
      // This is the key bug fix test: user.role is always 'admin' in DB for all registered
      // users, but platformRole correctly reflects the org-context role from UserOrganization.
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        platformRole: 'MEMBER',
        role: 'admin', // DB field — must NOT take precedence over platformRole
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should deny VIEWER via platformRole even when role field is admin (critical regression)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        platformRole: 'VIEWER',
        role: 'admin', // DB field — must NOT take precedence over platformRole
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should deny MEMBER user (role field only, no platformRole)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'MEMBER',
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Required platform role: ADMIN');
    });

    it('should deny VIEWER user (role field only, no platformRole)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'VIEWER',
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('when requiring MEMBER role', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockReturnValue(PlatformRole.MEMBER);
    });

    it('should allow ADMIN user (higher privilege) via platformRole', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        platformRole: 'ADMIN',
        role: 'admin',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow MEMBER user via platformRole', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        platformRole: 'MEMBER',
        role: 'admin', // base DB role — ignored when platformRole present
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny VIEWER user via platformRole', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        platformRole: 'VIEWER',
        role: 'admin', // base DB role — ignored when platformRole present
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow ADMIN user (role field fallback)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'ADMIN',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow MEMBER user (role field fallback)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'MEMBER',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny VIEWER user (role field fallback)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'VIEWER',
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});
