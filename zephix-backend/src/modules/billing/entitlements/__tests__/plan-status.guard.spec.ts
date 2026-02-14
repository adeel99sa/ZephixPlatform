/**
 * Phase 3A: PlanStatusGuard Tests
 *
 * Tests global guard that blocks writes when plan is not active.
 */
import { PlanStatusGuard } from '../plan-status.guard';
import { ForbiddenException } from '@nestjs/common';

describe('PlanStatusGuard', () => {
  let guard: PlanStatusGuard;
  let mockEntitlementService: any;

  const createContext = (
    method: string,
    organizationId: string | null = 'org-1',
  ) => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        method,
        url: '/api/test',
        user: organizationId
          ? { id: 'user-1', organizationId, platformRole: 'MEMBER' }
          : undefined,
      }),
    }),
  });

  beforeEach(() => {
    mockEntitlementService = {
      getPlanStatus: jest.fn().mockResolvedValue('active'),
    };
    guard = new PlanStatusGuard(mockEntitlementService);
  });

  // ── Read methods always allowed ───────────────────────────────────

  it('allows GET regardless of plan status', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('past_due');
    const ctx = createContext('GET');
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('allows HEAD regardless of plan status', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('canceled');
    const ctx = createContext('HEAD');
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('allows OPTIONS regardless of plan status', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('canceled');
    const ctx = createContext('OPTIONS');
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  // ── Active plan ───────────────────────────────────────────────────

  it('allows POST when plan is active', async () => {
    const ctx = createContext('POST');
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('allows PATCH when plan is active', async () => {
    const ctx = createContext('PATCH');
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('allows DELETE when plan is active', async () => {
    const ctx = createContext('DELETE');
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  // ── Inactive plan ─────────────────────────────────────────────────

  it('blocks POST when plan is past_due', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('past_due');
    const ctx = createContext('POST');
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
  });

  it('blocks PATCH when plan is canceled', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('canceled');
    const ctx = createContext('PATCH');
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
  });

  it('blocks DELETE when plan is past_due', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('past_due');
    const ctx = createContext('DELETE');
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
  });

  it('error includes PLAN_INACTIVE code', async () => {
    mockEntitlementService.getPlanStatus.mockResolvedValue('past_due');
    const ctx = createContext('POST');
    try {
      await guard.canActivate(ctx as any);
      fail('Should throw');
    } catch (err: any) {
      const resp = err.getResponse?.() ?? {};
      expect(resp.code).toBe('PLAN_INACTIVE');
      expect(resp.planStatus).toBe('past_due');
    }
  });

  // ── No org context ────────────────────────────────────────────────

  it('allows POST when no org context (unauthenticated/system route)', async () => {
    const ctx = createContext('POST', null);
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });
});
