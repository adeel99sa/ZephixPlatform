import { Logger } from '@nestjs/common';
import {
  ConditionType,
  RuleCondition,
} from '../entities/governance-rule.entity';

/** Module logger — unknown condition types are ERROR-level bugs (GOV-FIX-B1). */
const conditionLogger = new Logger('GovernanceConditionEvaluators');

export interface ConditionContext {
  entity: Record<string, any>;
  actor: { userId: string; platformRole: string; workspaceRole?: string };
  relatedEntities?: Record<string, any[]>;
}

export interface ConditionResult {
  passed: boolean;
  conditionType: ConditionType;
  field?: string;
  message?: string;
  /**
   * GOV-FIX-B1 canon: true when the input data needed to decide this condition
   * is ABSENT (missing/NaN). Cannot-determine is NOT "condition not met" — the
   * engine must fail closed on this, never ALLOW. `passed` is forced false so a
   * legacy `filter(!passed)` still treats it as a violation, but `indeterminate`
   * is what enforcement keys off to avoid a silent allow.
   */
  indeterminate?: boolean;
}

type ConditionEvaluator = (
  condition: RuleCondition,
  ctx: ConditionContext,
) => ConditionResult;

const evaluators: Record<ConditionType, ConditionEvaluator> = {
  [ConditionType.REQUIRED_FIELD]: (condition, ctx) => {
    const value = ctx.entity[condition.field ?? ''];
    const passed =
      value !== null && value !== undefined && value !== '';
    return {
      passed,
      conditionType: ConditionType.REQUIRED_FIELD,
      field: condition.field,
      message: passed
        ? undefined
        : `Field '${condition.field}' is required`,
    };
  },

  [ConditionType.FIELD_NOT_EMPTY]: (condition, ctx) => {
    const value = ctx.entity[condition.field ?? ''];
    const passed =
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0);
    return {
      passed,
      conditionType: ConditionType.FIELD_NOT_EMPTY,
      field: condition.field,
      message: passed
        ? undefined
        : `Field '${condition.field}' must not be empty`,
    };
  },

  [ConditionType.FIELD_EQUALS]: (condition, ctx) => {
    const value = ctx.entity[condition.field ?? ''];
    const passed = String(value) === String(condition.value);
    return {
      passed,
      conditionType: ConditionType.FIELD_EQUALS,
      field: condition.field,
      message: passed
        ? undefined
        : `Field '${condition.field}' must equal '${condition.value}', got '${value}'`,
    };
  },

  [ConditionType.NUMBER_GTE]: (condition, ctx) => {
    const raw = ctx.entity[condition.field ?? ''];
    const value = Number(raw);
    const threshold = Number(condition.value);
    // Canon: absent/non-numeric input is cannot-determine — never a silent pass.
    const indeterminate =
      raw === null || raw === undefined || isNaN(value) || isNaN(threshold);
    const passed = !indeterminate && value >= threshold;
    return {
      passed,
      indeterminate: indeterminate || undefined,
      conditionType: ConditionType.NUMBER_GTE,
      field: condition.field,
      message: indeterminate
        ? `Field '${condition.field}' could not be evaluated (missing or non-numeric)`
        : passed
          ? undefined
          : `Field '${condition.field}' must be >= ${threshold}, got ${value}`,
    };
  },

  [ConditionType.NUMBER_LTE]: (condition, ctx) => {
    const raw = ctx.entity[condition.field ?? ''];
    const value = Number(raw);
    const threshold = Number(condition.value);
    // Canon: absent/non-numeric input is cannot-determine — never a silent pass.
    const indeterminate =
      raw === null || raw === undefined || isNaN(value) || isNaN(threshold);
    const passed = !indeterminate && value <= threshold;
    return {
      passed,
      indeterminate: indeterminate || undefined,
      conditionType: ConditionType.NUMBER_LTE,
      field: condition.field,
      message: indeterminate
        ? `Field '${condition.field}' could not be evaluated (missing or non-numeric)`
        : passed
          ? undefined
          : `Field '${condition.field}' must be <= ${threshold}, got ${value}`,
    };
  },

  [ConditionType.ROLE_ALLOWED]: (condition, ctx) => {
    const allowedRoles = (condition.params?.roles as string[]) ?? [];
    const actorRole =
      ctx.actor.workspaceRole ?? ctx.actor.platformRole ?? '';
    const passed = allowedRoles.includes(actorRole);
    return {
      passed,
      conditionType: ConditionType.ROLE_ALLOWED,
      message: passed
        ? undefined
        : `Role '${actorRole}' is not in allowed roles [${allowedRoles.join(', ')}]`,
    };
  },

  [ConditionType.USER_ALLOWED]: (condition, ctx) => {
    const allowedUsers = (condition.params?.userIds as string[]) ?? [];
    const passed = allowedUsers.includes(ctx.actor.userId);
    return {
      passed,
      conditionType: ConditionType.USER_ALLOWED,
      message: passed
        ? undefined
        : `User is not in the allowed users list`,
    };
  },

  [ConditionType.EXISTS_RELATED]: (condition, ctx) => {
    const relatedKey = condition.relatedEntity ?? '';
    const related = ctx.relatedEntities?.[relatedKey] ?? [];
    const minCount = Number(condition.params?.minCount ?? 1);
    const statusFilter = condition.params?.status as string | undefined;

    let matching = related;
    if (statusFilter) {
      matching = related.filter(
        (r) => r.status === statusFilter || r.state === statusFilter,
      );
    }

    const passed = matching.length >= minCount;
    return {
      passed,
      conditionType: ConditionType.EXISTS_RELATED,
      message: passed
        ? undefined
        : `Expected at least ${minCount} related '${relatedKey}'${statusFilter ? ` with status '${statusFilter}'` : ''}, found ${matching.length}`,
    };
  },

  [ConditionType.APPROVALS_MET]: (condition, ctx) => {
    const approvals = ctx.relatedEntities?.['approvals'] ?? [];
    const requiredCount = Number(condition.params?.requiredCount ?? 1);
    const approvedCount = approvals.filter(
      (a) =>
        a.decision === 'APPROVED' ||
        a.decision === 'approved' ||
        a.status === 'APPROVED',
    ).length;
    const passed = approvedCount >= requiredCount;
    return {
      passed,
      conditionType: ConditionType.APPROVALS_MET,
      message: passed
        ? undefined
        : `Required ${requiredCount} approvals, got ${approvedCount}`,
    };
  },
};

export function evaluateCondition(
  condition: RuleCondition,
  ctx: ConditionContext,
): ConditionResult {
  const evaluator = evaluators[condition.type];
  if (!evaluator) {
    // Canon: an unknown condition type is cannot-determine (FE/BE version skew,
    // a rule authored under a newer catalog, a seed typo, a replayed historical
    // rule whose type was renamed). It is a BUG, not a state — log at ERROR and
    // fail closed (indeterminate). An evaluable BLOCK/WARN rule must not silently
    // allow a condition it cannot understand.
    conditionLogger.error(
      `Unknown governance condition type '${condition.type}' — treating as indeterminate (fail closed)`,
    );
    return {
      passed: false,
      indeterminate: true,
      conditionType: condition.type,
      message: `Unknown condition type '${condition.type}' — cannot evaluate`,
    };
  }
  return evaluator(condition, ctx);
}

export function evaluateAllConditions(
  conditions: RuleCondition[],
  ctx: ConditionContext,
): ConditionResult[] {
  return conditions.map((c) => evaluateCondition(c, ctx));
}
