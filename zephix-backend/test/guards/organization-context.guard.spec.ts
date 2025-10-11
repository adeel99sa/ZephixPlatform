import { ExecutionContext } from '@nestjs/common';
import { OrganizationContextGuard } from '../../src/guards/organization-context.guard';

describe('OrganizationContextGuard', () => {
  let guard: OrganizationContextGuard;

  beforeEach(() => {
    guard = new OrganizationContextGuard();
  });

  it('sets req.organizationId from req.user.organizationId', () => {
    const req: any = { user: { id: 'u1', organizationId: 'org1' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const ok = guard.canActivate(ctx);
    expect(ok).toBe(true);
    expect(req.organizationId).toBe('org1');
  });

  it('sets req.organizationId to undefined when user has no organizationId', () => {
    const req: any = { user: { id: 'u1' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const ok = guard.canActivate(ctx);
    expect(ok).toBe(true);
    expect(req.organizationId).toBeUndefined();
  });

  it('sets req.organizationId to undefined when user is null', () => {
    const req: any = { user: null };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const ok = guard.canActivate(ctx);
    expect(ok).toBe(true);
    expect(req.organizationId).toBeUndefined();
  });

  it('sets req.organizationId to undefined when user is undefined', () => {
    const req: any = {};
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const ok = guard.canActivate(ctx);
    expect(ok).toBe(true);
    expect(req.organizationId).toBeUndefined();
  });
});
