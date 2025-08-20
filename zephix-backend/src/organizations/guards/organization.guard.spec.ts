import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationGuard } from './organization.guard';

// ✅ SENIOR-LEVEL GUARD TEST IMPLEMENTATION
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
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OrganizationGuard>(OrganizationGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when organization matches', () => {
      const mockRequest = {
        user: { organizationId: 'org-1' },
        params: { organizationId: 'org-1' },
        headers: { 'x-org-id': 'org-1' },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when organization does not match', () => {
      const mockRequest = {
        user: { organizationId: 'org-1' },
        params: { organizationId: 'org-2' },
        headers: { 'x-org-id': 'org-2' },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow();
    });

    it('should deny access when user has no organization', () => {
      const mockRequest = {
        user: {},
        params: { organizationId: 'org-1' },
        headers: { 'x-org-id': 'org-1' },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow();
    });
  });
});
