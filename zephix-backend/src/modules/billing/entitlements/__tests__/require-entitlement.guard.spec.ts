/**
 * Phase 3A: RequireEntitlement Guard Tests
 *
 * Tests the decorator-based entitlement guard behavior.
 */
import { EntitlementGuard } from '../require-entitlement.guard';
import { ForbiddenException } from '@nestjs/common';
import { EntitlementService } from '../entitlement.service';

describe('EntitlementGuard', () => {
  let guard: EntitlementGuard;
  let mockReflector: any;
  let mockEntitlementService: any;

  const createContext = (organizationId: string | null = 'org-1') => ({
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: organizationId
          ? { id: 'user-1', organizationId, platformRole: 'MEMBER' }
          : null,
      }),
    }),
  });

  beforeEach(() => {
    mockReflector = {
      get: jest.fn().mockReturnValue(null),
    };
    mockEntitlementService = {
      assertFeature: jest.fn().mockResolvedValue(undefined),
    };
    guard = new EntitlementGuard(mockReflector, mockEntitlementService);
  });

  it('allows request when no entitlement metadata set', async () => {
    const ctx = createContext();
    const result = await guard.canActivate(ctx as any);
    expect(result).toBe(true);
    expect(mockEntitlementService.assertFeature).not.toHaveBeenCalled();
  });

  it('calls assertFeature when handler-level entitlement set', async () => {
    mockReflector.get.mockImplementation((key: string, target: any) => {
      // Return 'capacity_engine' for handler, null for class
      return target === (createContext().getHandler()) ? null : 'capacity_engine';
    });
    // Simplify: return key for first call
    mockReflector.get.mockReturnValueOnce('capacity_engine');

    const ctx = createContext();
    await guard.canActivate(ctx as any);
    expect(mockEntitlementService.assertFeature).toHaveBeenCalledWith('org-1', 'capacity_engine');
  });

  it('blocks when assertFeature throws', async () => {
    mockReflector.get.mockReturnValueOnce('what_if_scenarios');
    mockEntitlementService.assertFeature.mockRejectedValue(
      new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' }),
    );

    const ctx = createContext();
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
  });

  it('passes when no organizationId (skips check)', async () => {
    mockReflector.get.mockReturnValueOnce('capacity_engine');
    // Create context with user that has id but no organizationId
    const ctx = {
      getHandler: jest.fn().mockReturnValue({}),
      getClass: jest.fn().mockReturnValue({}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-1', organizationId: null, platformRole: 'MEMBER' },
        }),
      }),
    };
    const result = await guard.canActivate(ctx as any);
    expect(result).toBe(true);
  });

  it('reads class-level metadata as fallback', async () => {
    mockReflector.get
      .mockReturnValueOnce(null) // handler
      .mockReturnValueOnce('portfolio_rollups'); // class
    const ctx = createContext();
    await guard.canActivate(ctx as any);
    expect(mockEntitlementService.assertFeature).toHaveBeenCalledWith('org-1', 'portfolio_rollups');
  });
});
