import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OrganizationValidationGuard } from './organization-validation.guard';

describe('OrganizationValidationGuard', () => {
  let guard: OrganizationValidationGuard;
  let mockExecutionContext: Partial<ExecutionContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationValidationGuard],
    }).compile();

    guard = module.get<OrganizationValidationGuard>(OrganizationValidationGuard);
    
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
      }),
    };
  });

  it('should return true when organizationId is present', () => {
    const mockRequest = { organizationId: 'org-123' };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

    const result = guard.canActivate(mockExecutionContext as ExecutionContext);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when organizationId is missing', () => {
    const mockRequest = { organizationId: undefined };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

    expect(() => {
      guard.canActivate(mockExecutionContext as ExecutionContext);
    }).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when organizationId is null', () => {
    const mockRequest = { organizationId: null };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

    expect(() => {
      guard.canActivate(mockExecutionContext as ExecutionContext);
    }).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when organizationId is empty string', () => {
    const mockRequest = { organizationId: '' };
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

    expect(() => {
      guard.canActivate(mockExecutionContext as ExecutionContext);
    }).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when request object is missing organizationId property', () => {
    const mockRequest = {};
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

    expect(() => {
      guard.canActivate(mockExecutionContext as ExecutionContext);
    }).toThrow(ForbiddenException);
  });
});
