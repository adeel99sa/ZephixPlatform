import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantMiddleware } from '../../src/middleware/tenant.middleware';
import { OrganizationValidationGuard } from '../../src/guards/organization-validation.guard';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';

describe('Organization Flow Integration', () => {
  let app: INestApplication;
  let middleware: TenantMiddleware;
  let guard: OrganizationValidationGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantMiddleware, OrganizationValidationGuard],
    }).compile();

    app = module.createNestApplication();
    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    guard = module.get<OrganizationValidationGuard>(OrganizationValidationGuard);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete flow: JWT only (Phase 1)', () => {
    it('should work with valid JWT organizationId', () => {
      const mockRequest = {
        user: { organizationId: 'org-123' },
        headers: {},
        header: jest.fn().mockReturnValue(undefined),
      } as any;
      const mockResponse = {} as Response;
      const mockNext = jest.fn();

      // Step 1: Middleware processes request
      middleware.use(mockRequest, mockResponse, mockNext);
      
      expect(mockRequest.organizationId).toBe('org-123');
      expect(mockNext).toHaveBeenCalled();

      // Step 2: Guard validates the normalized organizationId
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should work with JWT organizationId and matching header', () => {
      const mockRequest = {
        user: { organizationId: 'org-123' },
        headers: { 'X-Organization-Id': 'org-123' },
        header: jest.fn().mockReturnValue('org-123'),
      } as any;
      const mockResponse = {} as Response;
      const mockNext = jest.fn();

      // Step 1: Middleware processes request
      middleware.use(mockRequest, mockResponse, mockNext);
      
      expect(mockRequest.organizationId).toBe('org-123');
      expect(mockNext).toHaveBeenCalled();

      // Step 2: Guard validates the normalized organizationId
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should use JWT organizationId when header differs (Phase 1 behavior)', () => {
      const mockRequest = {
        user: { organizationId: 'org-123' },
        headers: { 'X-Organization-Id': 'org-456' },
        header: jest.fn().mockReturnValue('org-456'),
      } as any;
      const mockResponse = {} as Response;
      const mockNext = jest.fn();

      // Step 1: Middleware processes request
      middleware.use(mockRequest, mockResponse, mockNext);
      
      // Should use JWT org, not header (Phase 1)
      expect(mockRequest.organizationId).toBe('org-123');
      expect(mockNext).toHaveBeenCalled();

      // Step 2: Guard validates the normalized organizationId
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should fail when JWT has no organizationId', () => {
      const mockRequest = {
        user: { id: 'user-123' },
        headers: {},
        header: jest.fn().mockReturnValue(undefined),
      } as any;
      const mockResponse = {} as Response;
      const mockNext = jest.fn();

      // Step 1: Middleware processes request
      middleware.use(mockRequest, mockResponse, mockNext);
      
      expect(mockRequest.organizationId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();

      // Step 2: Guard should fail
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => {
        guard.canActivate(mockExecutionContext);
      }).toThrow('Organization context required');
    });
  });

  describe('Error scenarios', () => {
    it('should handle missing user gracefully', () => {
      const mockRequest = {
        user: undefined,
        headers: {},
        header: jest.fn().mockReturnValue(undefined),
      } as any;
      const mockResponse = {} as Response;
      const mockNext = jest.fn();

      middleware.use(mockRequest, mockResponse, mockNext);
      
      expect(mockRequest.organizationId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => {
        guard.canActivate(mockExecutionContext);
      }).toThrow('Organization context required');
    });
  });
});
