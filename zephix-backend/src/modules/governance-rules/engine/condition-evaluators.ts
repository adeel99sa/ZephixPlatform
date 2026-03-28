import {
  ConditionType,
  RuleCondition,
} from '../entities/governance-rule.entity';

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
    const value = Number(ctx.entity[condition.field ?? '']);
    const threshold = Number(condition.value);
    const passed = !isNaN(value) && !isNaN(threshold) && value >= threshold;
    return {
      passed,
      conditionType: ConditionType.NUMBER_GTE,
      field: condition.field,
      message: passed
        ? undefined
        : `Field '${condition.field}' must be >= ${threshold}, got ${value}`,
    };
  },

  [ConditionType.NUMBER_LTE]: (condition, ctx) => {
    const value = Number(ctx.entity[condition.field ?? '']);
    const threshold = Number(condition.value);
    const passed = !isNaN(value) && !isNaN(threshold) && value <= threshold;
    return {
      passed,
      conditionType: ConditionType.NUMBER_LTE,
      field: condition.field,
      message: passed
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
    return {
      passed: true,
      conditionType: condition.type,
      message: `Unknown condition type '${condition.type}', skipped`,
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
