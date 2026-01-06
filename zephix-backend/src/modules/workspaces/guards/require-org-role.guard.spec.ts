import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireOrgRoleGuard } from './require-org-role.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

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

    it('should allow ADMIN user', () => {
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
        role: 'admin', // Legacy
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny MEMBER user', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'MEMBER',
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Required platform role: ADMIN');
    });

    it('should deny VIEWER user', () => {
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

    it('should allow ADMIN user (higher privilege)', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'ADMIN',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow MEMBER user', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'MEMBER',
        organizationId: 'org-1',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny VIEWER user', () => {
      mockContext.switchToHttp().getRequest().user = {
        id: 'user-1',
        role: 'VIEWER',
        organizationId: 'org-1',
      };

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});







