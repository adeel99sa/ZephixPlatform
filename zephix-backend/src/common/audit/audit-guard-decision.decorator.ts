import { SetMetadata } from '@nestjs/common';
import {
  AUDIT_GUARD_DECISION_METADATA_KEY,
  AuditGuardDecisionMetadata,
} from './guard-audit.constants';

/**
 * Marks a route for optional guard-audit emission (AD-027 Section 12.3).
 * Only `config` and `destructive` categories emit at the interceptor/filter layer;
 * `read` / `write` are reserved for future extension.
 */
export const AuditGuardDecision = (metadata: AuditGuardDecisionMetadata) =>
  SetMetadata(AUDIT_GUARD_DECISION_METADATA_KEY, metadata);
