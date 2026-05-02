import 'reflect-metadata';
import { AUDIT_GUARD_DECISION_METADATA_KEY } from '../../../common/audit/guard-audit.constants';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionsController } from './sessions.controller';

/**
 * Reflect-only checks: AD-027 @AuditGuardDecision on session mutations (Engine 1 PR #1).
 */
describe('SessionsController — AD-027 guard audit metadata', () => {
  function getClassGuards(target: typeof SessionsController): Function[] {
    const guards = Reflect.getMetadata('__guards__', target) || [];
    return guards.map((g: any) => (typeof g === 'function' ? g : g?.constructor));
  }

  const proto = SessionsController.prototype;

  it('controller is JwtAuthGuard-protected', () => {
    expect(getClassGuards(SessionsController)).toContain(JwtAuthGuard);
  });

  it('POST :id/revoke carries destructive AuditGuardDecision', () => {
    const meta = Reflect.getMetadata(AUDIT_GUARD_DECISION_METADATA_KEY, proto.revokeSession);
    expect(meta?.action).toBe('destructive');
    expect(meta?.scope).toBe('global');
    expect(meta?.requiredRole).toBe('authenticated');
  });

  it('POST revoke-others carries destructive AuditGuardDecision', () => {
    const meta = Reflect.getMetadata(AUDIT_GUARD_DECISION_METADATA_KEY, proto.revokeOthers);
    expect(meta?.action).toBe('destructive');
    expect(meta?.scope).toBe('global');
    expect(meta?.requiredRole).toBe('authenticated');
  });
});
