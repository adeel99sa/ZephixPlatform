import { RuleCondition, ConditionType } from '../entities/governance-rule.entity';
import { ResolvedRule } from '../services/governance-rule-resolver.service';

/** Hard cap for inputs_snapshot JSON payload in bytes. */
const MAX_SNAPSHOT_BYTES = 16 * 1024; // 16 KB

const SNAPSHOT_TRUNCATED = '__SNAPSHOT_TRUNCATED__';

/**
 * Extract the set of entity fields referenced by all conditions
 * across the applicable rules. Only these fields are included
 * in the persisted inputs_snapshot.
 */
export function extractRequiredFields(rules: ResolvedRule[]): Set<string> {
  const fields = new Set<string>();
  for (const rule of rules) {
    for (const cond of rule.ruleDefinition.conditions) {
      const needed = getFieldsForCondition(cond);
      for (const f of needed) fields.add(f);
    }
  }
  return fields;
}

function getFieldsForCondition(cond: RuleCondition): string[] {
  switch (cond.type) {
    case ConditionType.REQUIRED_FIELD:
    case ConditionType.FIELD_NOT_EMPTY:
    case ConditionType.FIELD_EQUALS:
    case ConditionType.NUMBER_GTE:
    case ConditionType.NUMBER_LTE:
      return cond.field ? [cond.field] : [];
    case ConditionType.ROLE_ALLOWED:
    case ConditionType.USER_ALLOWED:
      return [];
    case ConditionType.EXISTS_RELATED:
    case ConditionType.APPROVALS_MET:
      return [];
    default:
      return cond.field ? [cond.field] : [];
  }
}

/**
 * Build a minimal inputs_snapshot containing only condition-referenced fields
 * and core identity/actor context. Enforces the 16 KB hard cap.
 */
export function buildInputsSnapshot(params: {
  entityId: string;
  entityType: string;
  fromValue: string | null;
  toValue: string | null;
  entity: Record<string, any>;
  actor: { userId: string; platformRole: string; workspaceRole?: string };
  requiredFields: Set<string>;
}): Record<string, any> {
  // Always include identity fields
  const snapshot: Record<string, any> = {
    entityId: params.entityId,
    entityType: params.entityType,
    fromValue: params.fromValue,
    toValue: params.toValue,
    actorUserId: params.actor.userId,
  };

  // Include only condition-referenced entity fields
  const entityFields: Record<string, any> = {};
  for (const field of params.requiredFields) {
    if (field in params.entity) {
      entityFields[field] = params.entity[field];
    }
  }
  snapshot.entityFields = entityFields;

  return enforceSnapshotCap(snapshot);
}

/**
 * Enforce the 16 KB hard cap on the snapshot.
 * If it exceeds, truncate large string fields and add a marker.
 */
function enforceSnapshotCap(
  snapshot: Record<string, any>,
): Record<string, any> {
  let json = JSON.stringify(snapshot);
  if (json.length <= MAX_SNAPSHOT_BYTES) return snapshot;

  // Truncate large string values in entityFields
  const entityFields = snapshot.entityFields as Record<string, any>;
  if (entityFields) {
    const fieldSizes = Object.entries(entityFields)
      .map(([key, val]) => ({
        key,
        size: JSON.stringify(val)?.length ?? 0,
      }))
      .sort((a, b) => b.size - a.size);

    for (const { key } of fieldSizes) {
      const val = entityFields[key];
      if (typeof val === 'string' && val.length > 200) {
        entityFields[key] = val.slice(0, 200) + '…[truncated]';
      } else if (Array.isArray(val) && val.length > 10) {
        entityFields[key] = val.slice(0, 10);
      }

      json = JSON.stringify(snapshot);
      if (json.length <= MAX_SNAPSHOT_BYTES) break;
    }
  }

  // If still over, mark and strip entityFields entirely
  if (json.length > MAX_SNAPSHOT_BYTES) {
    snapshot.entityFields = { _truncated: true };
    snapshot._snapshotStatus = SNAPSHOT_TRUNCATED;
  }

  return snapshot;
}
