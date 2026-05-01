/** Reflect metadata key for {@link AuditGuardDecision} */
export const AUDIT_GUARD_DECISION_METADATA_KEY = 'zephix:audit_guard_decision';

/** Must stay aligned with {@link main.ts} `setGlobalPrefix` */
export const NEST_HTTP_GLOBAL_PREFIX = 'api';

export type GuardAuditActionCategory =
  | 'read'
  | 'write'
  | 'config'
  | 'destructive';

export type GuardAuditScope =
  | 'organization'
  | 'workspace'
  | 'project'
  | 'global';

export interface AuditGuardDecisionMetadata {
  action: GuardAuditActionCategory;
  scope: GuardAuditScope;
  /** Required when action is config/destructive (emission skipped if empty). */
  requiredRole?: string;
}

/** AD-027 Section 12: only config/destructive emit at guard/interceptor layer. */
export function shouldEmitGuardAuditAction(
  action: GuardAuditActionCategory,
): boolean {
  return action === 'config' || action === 'destructive';
}
