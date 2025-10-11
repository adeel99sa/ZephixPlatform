import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware } from './tenant.middleware';
import { Request, Response, NextFunction } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockRequest: Partial<Request & { user?: any; organizationId?: string }>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantMiddleware],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should set organizationId from JWT when no header is present', () => {
    mockRequest.user = { organizationId: 'org-123' };
    
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    
    expect(mockRequest.organizationId).toBe('org-123');
    expect(mockRequest['dbContext']).toEqual({ organizationId: 'org-123' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set organizationId from JWT when header matches JWT', () => {
    mockRequest.user = { organizationId: 'org-123' };
    mockRequest.headers = { 'X-Organization-Id': 'org-123' };
    
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    
    expect(mockRequest.organizationId).toBe('org-123');
    expect(mockRequest['dbContext']).toEqual({ organizationId: 'org-123' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use JWT organizationId when header is different (Phase 1: no switching)', () => {
    mockRequest.user = { organizationId: 'org-123' };
    mockRequest.headers = { 'X-Organization-Id': 'org-456' };
    
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    
    // Phase 1: Should use JWT org, not header
    expect(mockRequest.organizationId).toBe('org-123');
    expect(mockRequest['dbContext']).toEqual({ organizationId: 'org-123' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle missing user gracefully', () => {
    mockRequest.user = undefined;
    
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    
    expect(mockRequest.organizationId).toBeUndefined();
    expect(mockRequest['dbContext']).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle missing organizationId in user gracefully', () => {
    mockRequest.user = { id: 'user-123' };
    
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    
    expect(mockRequest.organizationId).toBeUndefined();
    expect(mockRequest['dbContext']).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle missing headers gracefully', () => {
    mockRequest.user = { organizationId: 'org-123' };
    mockRequest.headers = {};
    
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    
    expect(mockRequest.organizationId).toBe('org-123');
    expect(mockRequest['dbContext']).toEqual({ organizationId: 'org-123' });
    expect(mockNext).toHaveBeenCalled();
  });
});
