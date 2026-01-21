import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminOnlyGuard } from './admin-only.guard';

describe('AdminOnlyGuard', () => {
  const createContext = (user: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  it('allows platformRole ADMIN', () => {
    const guard = new AdminOnlyGuard();
    const context = createContext({ platformRole: 'ADMIN', role: 'member' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows legacy role admin when platformRole missing', () => {
    const guard = new AdminOnlyGuard();
    const context = createContext({ role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies when platformRole is MEMBER even if role is admin', () => {
    const guard = new AdminOnlyGuard();
    const context = createContext({ platformRole: 'MEMBER', role: 'admin' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Forbidden');
  });

  it('denies when role is missing', () => {
    const guard = new AdminOnlyGuard();
    const context = createContext({});

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Forbidden');
  });
});
