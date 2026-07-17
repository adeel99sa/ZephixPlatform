import { AuditAction, AuditEntityType } from './audit.constants';

/**
 * SEC-4 — schema-parity guard for audit_events.action / entity_type CHECK
 * constraints. This is the mechanism that makes the CHECK↔enum drift class
 * (which silently swallowed `password_reset_link_generated` and `template`
 * receipts for months) a RED BOARD forever.
 *
 * Two directions, enforced by verify-audit-enum-parity against the live,
 * freshly-migrated DB in the required Schema Parity CI gate:
 *   A (STRICT): every AuditAction / AuditEntityType enum value MUST be in the
 *      live CHECK. A future enum addition without a matching migration fails
 *      the board instead of silently swallowing every write of that value.
 *   B (ALLOWLIST): every live CHECK value must be either in the enum OR in the
 *      known-non-enum allowlists below. A NEW unexplained CHECK value fails the
 *      board.
 *
 * PROVENANCE of the allowlists (SHRINK-ONLY — entries may be removed as they
 * are consolidated into the enum or pruned, but adding one requires
 * justification): these are CHECK values with no central-enum member. They are
 * a mix of (a) module-local vocabularies written by work-management /
 * change-requests / budgets / resources services via string literals, which
 * LAND (they are in the CHECK) but are not yet consolidated into the central
 * enum, and (b) genuinely dead vocabulary from removed/never-shipped features.
 * Distinguishing (a) from (b) requires a PRODUCTION `SELECT DISTINCT` read
 * (staging under-represents) — deferred to the PROD-DECOM investigation, where
 * prod tables are being read anyway. Pruning the dead subset is its own lane;
 * a risky drop+recreate to delete harmless allowlisted values buys tidiness,
 * not truth. Consolidating the module-literal subset shrinks this list (as the
 * PHASE_* vocabulary already did in SEC-4).
 */
export const KNOWN_NON_ENUM_ACTION_CHECK_VALUES: readonly string[] = [
  'BUDGET_APPROVED', 'BUDGET_UPDATED', 'CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST_CREATED',
  'CHANGE_REQUEST_REJECTED', 'CHANGE_REQUEST_UPDATED', 'DOCUMENT_CREATED', 'DOCUMENT_DELETED',
  'DOCUMENT_UPDATED', 'GATE_CREATED', 'GATE_EVALUATED', 'GATE_FAILED',
  'GATE_PASSED', 'PHASE_TRANSITION_APPROVED', 'PHASE_TRANSITION_REJECTED', 'PHASE_TRANSITION_REQUESTED',
  'PHASE_UPDATED', 'POLICY_CREATED', 'POLICY_DELETED', 'POLICY_UPDATED',
  'SPRINT_COMPLETED', 'SPRINT_CREATED', 'SPRINT_STARTED', 'SPRINT_UPDATED',
  'TASK_ASSIGNED', 'TASK_CREATED', 'TASK_DELETED', 'TASK_MOVED',
  'TASK_RESTORED', 'TASK_STATUS_CHANGED', 'TASK_UPDATED', 'TEMPLATE_ACTIVATED',
  'TEMPLATE_DEACTIVATED',
];

export const KNOWN_NON_ENUM_ENTITY_CHECK_VALUES: readonly string[] = [
  'ALLOCATION', 'BUDGET', 'CHANGE_REQUEST', 'DOCUMENT',
  'GATE', 'POLICY', 'RISK', 'SPRINT',
  'TAILORING_PROFILE', 'TASK', 'TEMPLATE', 'TEMPLATE_ACTIVATION',
];

export interface AuditParityResult {
  ok: boolean;
  errors: string[];
}

/**
 * Pure parity check — no DB, no I/O. The CI script reads the live CHECK values
 * and passes them here; the unit test passes fixtures.
 */
export function verifyAuditEnumParity(live: {
  checkActions: string[];
  checkEntities: string[];
}): AuditParityResult {
  const errors: string[] = [];
  const enumActions = Object.values(AuditAction) as string[];
  const enumEntities = Object.values(AuditEntityType) as string[];
  const checkActions = new Set(live.checkActions);
  const checkEntities = new Set(live.checkEntities);
  const allowActions = new Set(KNOWN_NON_ENUM_ACTION_CHECK_VALUES);
  const allowEntities = new Set(KNOWN_NON_ENUM_ENTITY_CHECK_VALUES);

  // Direction A (STRICT): every enum value must be in the live CHECK.
  for (const a of enumActions) {
    if (!checkActions.has(a)) {
      errors.push(
        `DIRECTION A: AuditAction '${a}' is NOT in CHK_audit_events_action — writes of it are SILENTLY SWALLOWED. Add it via a migration.`,
      );
    }
  }
  for (const e of enumEntities) {
    if (!checkEntities.has(e)) {
      errors.push(
        `DIRECTION A: AuditEntityType '${e}' is NOT in CHK_audit_events_entity_type — writes of it are SILENTLY SWALLOWED. Add it via a migration.`,
      );
    }
  }

  // Direction B (ALLOWLIST): every live CHECK value must be enum-known or allowlisted.
  const enumActionSet = new Set(enumActions);
  const enumEntitySet = new Set(enumEntities);
  for (const a of checkActions) {
    if (!enumActionSet.has(a) && !allowActions.has(a)) {
      errors.push(
        `DIRECTION B: CHECK action '${a}' is neither in AuditAction nor the known-non-enum allowlist. If intentional, add it to the enum (preferred) or the allowlist with provenance.`,
      );
    }
  }
  for (const e of checkEntities) {
    if (!enumEntitySet.has(e) && !allowEntities.has(e)) {
      errors.push(
        `DIRECTION B: CHECK entity_type '${e}' is neither in AuditEntityType nor the known-non-enum allowlist.`,
      );
    }
  }

  // Hygiene: allowlist entries must not overlap the enum (stale after consolidation).
  for (const a of KNOWN_NON_ENUM_ACTION_CHECK_VALUES) {
    if (enumActionSet.has(a)) {
      errors.push(
        `HYGIENE: action '${a}' is in BOTH the enum and the known-non-enum allowlist — remove it from the allowlist (it was consolidated).`,
      );
    }
  }
  for (const e of KNOWN_NON_ENUM_ENTITY_CHECK_VALUES) {
    if (enumEntitySet.has(e)) {
      errors.push(
        `HYGIENE: entity_type '${e}' is in BOTH the enum and the allowlist — remove it from the allowlist.`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
