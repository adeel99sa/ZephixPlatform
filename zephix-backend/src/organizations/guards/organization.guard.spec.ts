import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OrganizationGuard } from './organization.guard';

describe('OrganizationGuard', () => {
  let guard: OrganizationGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OrganizationGuard>(OrganizationGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        params: {},
        headers: {},
        query: {},
        body: {},
        user: null,
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      mockRequest.user = null;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extract organizationId from params', async () => {
      const mockUser = {
        id: 'user-123',
        organizationId: 'org-123',
        organizations: [{ id: 'org-123', role: 'admin' }],
      };

      mockRequest.user = mockUser;
      mockRequest.params.organizationId = 'org-123';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-123');
    });

    it('should extract organizationId from headers', async () => {
      const mockUser = {
        id: 'user-123',
        organizationId: 'org-123',
        organizations: [{ id: 'org-123', role: 'admin' }],
      };

      mockRequest.user = mockUser;
      mockRequest.headers['x-org-id'] = 'org-123';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-123');
    });

    it('should extract organizationId from query', async () => {
      const mockUser = {
        id: 'user-123',
        organizationId: 'org-123',
        organizations: [{ id: 'org-123', role: 'admin' }],
      };

      mockRequest.user = mockUser;
      mockRequest.query.organizationId = 'org-123';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-123');
    });

    it('should extract organizationId from body', async () => {
      const mockUser = {
        id: 'user-123',
        organizationId: 'org-123',
        organizations: [{ id: 'org-123', role: 'admin' }],
      };

      mockRequest.user = mockUser;
      mockRequest.body.organizationId = 'org-123';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-123');
    });

    it('should use default organizationId from user when none provided', async () => {
      const mockUser = {
        id: 'user-123',
        defaultOrganizationId: 'org-default',
        organizations: [{ id: 'org-default', role: 'member' }],
      };

      mockRequest.user = mockUser;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-default');
    });

    it('should use organizationId from user when none provided', async () => {
      const mockUser = {
        id: 'user-123',
        organizationId: 'org-user',
        organizations: [{ id: 'org-user', role: 'member' }],
      };

      mockRequest.user = mockUser;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-user');
    });

    it('should throw ForbiddenException when no organization context is available', async () => {
      const mockUser = {
        id: 'user-123',
        // No organization information
      };

      mockRequest.user = mockUser;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should validate access through organizations array', async () => {
      const mockUser = {
        id: 'user-123',
        organizations: [
          { id: 'org-1', role: 'admin' },
          { id: 'org-2', role: 'member' },
        ],
      };

      mockRequest.user = mockUser;
      mockRequest.params.organizationId = 'org-2';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-2');
      expect(mockRequest.organizationRole).toBe('member');
    });

    it('should validate access through userOrganizations array', async () => {
      const mockUser = {
        id: 'user-123',
        userOrganizations: [
          { organizationId: 'org-1', role: 'admin', isActive: true },
          { organizationId: 'org-2', role: 'member', isActive: true },
        ],
      };

      mockRequest.user = mockUser;
      mockRequest.params.organizationId = 'org-1';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-1');
      expect(mockRequest.organizationRole).toBe('admin');
    });

    it('should reject inactive user organizations', async () => {
      const mockUser = {
        id: 'user-123',
        userOrganizations: [
          { organizationId: 'org-1', role: 'admin', isActive: false },
        ],
      };

      mockRequest.user = mockUser;
      mockRequest.params.organizationId = 'org-1';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user has no access to organization', async () => {
      const mockUser = {
        id: 'user-123',
        organizations: [{ id: 'org-1', role: 'admin' }],
      };

      mockRequest.user = mockUser;
      mockRequest.params.organizationId = 'org-2'; // Different org

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should set organization context in request', async () => {
      const mockUser = {
        id: 'user-123',
        organizations: [{ id: 'org-123', role: 'admin', isActive: true }],
      };

      mockRequest.user = mockUser;
      mockRequest.params.organizationId = 'org-123';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-123');
      expect(mockRequest.userOrganization).toBeDefined();
      expect(mockRequest.organizationRole).toBe('admin');
    });
  });

  describe('private methods', () => {
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        params: {},
        headers: {},
        query: {},
        body: {},
      };
    });

    describe('extractOrganizationId', () => {
      it('should return organizationId from params with highest priority', () => {
        mockRequest.params.organizationId = 'org-params';
        mockRequest.headers['x-org-id'] = 'org-headers';
        mockRequest.query.organizationId = 'org-query';
        mockRequest.body.organizationId = 'org-body';

        // Use reflection to access private method
        const result = (guard as any).extractOrganizationId(mockRequest);
        expect(result).toBe('org-params');
      });

      it('should return organizationId from headers when params not available', () => {
        mockRequest.headers['x-org-id'] = 'org-headers';
        mockRequest.query.organizationId = 'org-query';
        mockRequest.body.organizationId = 'org-body';

        const result = (guard as any).extractOrganizationId(mockRequest);
        expect(result).toBe('org-headers');
      });

      it('should return undefined when no organizationId is available', () => {
        const result = (guard as any).extractOrganizationId(mockRequest);
        expect(result).toBeUndefined();
      });
    });

    describe('validateUserOrganizationAccess', () => {
      it('should return true for direct organization access', () => {
        const mockUser = { organizationId: 'org-123' };
        const result = (guard as any).validateUserOrganizationAccess(mockUser, 'org-123');
        expect(result).toBe(true);
      });

      it('should return true for access through organizations array', () => {
        const mockUser = {
          organizations: [{ id: 'org-123', role: 'admin' }],
        };
        const result = (guard as any).validateUserOrganizationAccess(mockUser, 'org-123');
        expect(result).toBe(true);
      });

      it('should return true for access through userOrganizations array', () => {
        const mockUser = {
          userOrganizations: [{ organizationId: 'org-123', isActive: true }],
        };
        const result = (guard as any).validateUserOrganizationAccess(mockUser, 'org-123');
        expect(result).toBe(true);
      });

      it('should return false for inactive user organization', () => {
        const mockUser = {
          userOrganizations: [{ organizationId: 'org-123', isActive: false }],
        };
        const result = (guard as any).validateUserOrganizationAccess(mockUser, 'org-123');
        expect(result).toBe(false);
      });

      it('should return false when no access is available', () => {
        const mockUser = { id: 'user-123' };
        const result = (guard as any).validateUserOrganizationAccess(mockUser, 'org-123');
        expect(result).toBe(false);
      });
    });
  });
});
