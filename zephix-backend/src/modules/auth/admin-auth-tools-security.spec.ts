import 'reflect-metadata';
import { AdminAuthToolsController } from './controllers/admin-auth-tools.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { RolesGuard } from '../../organizations/guards/roles.guard';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import {
  RateLimitPolicy,
  RATE_LIMIT_POLICY_KEY,
} from '../../common/rate-limit/rate-limit.constants';
import { ROLES_KEY } from '../../organizations/decorators/roles.decorator';

describe('AdminAuthToolsController — Security Guard Enforcement', () => {
  function getMethodGuards(target: any, method: string): Function[] {
    const guards = Reflect.getMetadata('__guards__', target[method]) || [];
    return guards.map((g: any) => (typeof g === 'function' ? g : g?.constructor));
  }

  function getPolicy(target: any, method: string): RateLimitPolicy | undefined {
    return Reflect.getMetadata(RATE_LIMIT_POLICY_KEY, target[method]);
  }

  const proto = AdminAuthToolsController.prototype;

  it('POST /admin/auth/mark-verified has required guard chain', () => {
    const guards = getMethodGuards(proto, 'markVerified');
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(OrganizationGuard);
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(RateLimiterGuard);
  });

  it('POST /admin/auth/mark-verified requires admin org role', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, proto.markVerified);
    expect(roles).toContain('admin');
  });

  it('POST /admin/auth/mark-verified has staging admin rate-limit policy', () => {
    expect(getPolicy(proto, 'markVerified')).toBe(
      RateLimitPolicy.STAGING_ADMIN_MARK_VERIFIED,
    );
  });
});
