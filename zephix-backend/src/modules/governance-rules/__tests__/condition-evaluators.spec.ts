import {
  evaluateCondition,
  evaluateAllConditions,
  ConditionContext,
} from '../engine/condition-evaluators';
import { ConditionType, RuleCondition } from '../entities/governance-rule.entity';

describe('Condition Evaluators', () => {
  const baseCtx: ConditionContext = {
    entity: {
      assigneeUserId: 'user-1',
      acceptanceCriteria: 'AC filled',
      remainingEstimate: 0,
      startDate: '2026-01-01',
      emptyField: '',
      nullField: null,
      arrayField: ['a', 'b'],
      emptyArray: [],
      numericField: 42,
    },
    actor: { userId: 'actor-1', platformRole: 'ADMIN', workspaceRole: 'OWNER' },
  };

  describe('REQUIRED_FIELD', () => {
    it('passes when field has a value', () => {
      const result = evaluateCondition(
        { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when field is null', () => {
      const result = evaluateCondition(
        { type: ConditionType.REQUIRED_FIELD, field: 'nullField' },
        baseCtx,
      );
      expect(result.passed).toBe(false);
      expect(result.message).toContain('nullField');
    });

    it('fails when field is empty string', () => {
      const result = evaluateCondition(
        { type: ConditionType.REQUIRED_FIELD, field: 'emptyField' },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });

    it('fails when field does not exist', () => {
      const result = evaluateCondition(
        { type: ConditionType.REQUIRED_FIELD, field: 'nonExistent' },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('FIELD_NOT_EMPTY', () => {
    it('passes for non-empty string', () => {
      const result = evaluateCondition(
        { type: ConditionType.FIELD_NOT_EMPTY, field: 'acceptanceCriteria' },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('passes for non-empty array', () => {
      const result = evaluateCondition(
        { type: ConditionType.FIELD_NOT_EMPTY, field: 'arrayField' },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails for empty array', () => {
      const result = evaluateCondition(
        { type: ConditionType.FIELD_NOT_EMPTY, field: 'emptyArray' },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });

    it('fails for empty string', () => {
      const result = evaluateCondition(
        { type: ConditionType.FIELD_NOT_EMPTY, field: 'emptyField' },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('FIELD_EQUALS', () => {
    it('passes when field matches value', () => {
      const result = evaluateCondition(
        { type: ConditionType.FIELD_EQUALS, field: 'numericField', value: '42' },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when field does not match', () => {
      const result = evaluateCondition(
        { type: ConditionType.FIELD_EQUALS, field: 'numericField', value: '99' },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('NUMBER_GTE', () => {
    it('passes when value is greater or equal', () => {
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_GTE, field: 'numericField', value: 40 },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when value is less', () => {
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_GTE, field: 'numericField', value: 50 },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('NUMBER_LTE', () => {
    it('passes when value is less or equal', () => {
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_LTE, field: 'remainingEstimate', value: 0 },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when value is greater', () => {
      const ctx = {
        ...baseCtx,
        entity: { ...baseCtx.entity, remainingEstimate: 5 },
      };
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_LTE, field: 'remainingEstimate', value: 0 },
        ctx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('ROLE_ALLOWED', () => {
    it('passes when actor role is in allowed list', () => {
      const result = evaluateCondition(
        {
          type: ConditionType.ROLE_ALLOWED,
          params: { roles: ['OWNER', 'ADMIN'] },
        },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when actor role is not in allowed list', () => {
      const ctx = {
        ...baseCtx,
        actor: { ...baseCtx.actor, workspaceRole: 'GUEST' },
      };
      const result = evaluateCondition(
        {
          type: ConditionType.ROLE_ALLOWED,
          params: { roles: ['OWNER', 'ADMIN'] },
        },
        ctx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('USER_ALLOWED', () => {
    it('passes when actor is in allowed users', () => {
      const result = evaluateCondition(
        {
          type: ConditionType.USER_ALLOWED,
          params: { userIds: ['actor-1', 'actor-2'] },
        },
        baseCtx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when actor is not in allowed users', () => {
      const result = evaluateCondition(
        {
          type: ConditionType.USER_ALLOWED,
          params: { userIds: ['other-user'] },
        },
        baseCtx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('EXISTS_RELATED', () => {
    it('passes when related entities exist', () => {
      const ctx: ConditionContext = {
        ...baseCtx,
        relatedEntities: {
          gateSubmissions: [{ status: 'APPROVED' }],
        },
      };
      const result = evaluateCondition(
        {
          type: ConditionType.EXISTS_RELATED,
          relatedEntity: 'gateSubmissions',
          params: { minCount: 1, status: 'APPROVED' },
        },
        ctx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when no related entities match status', () => {
      const ctx: ConditionContext = {
        ...baseCtx,
        relatedEntities: {
          gateSubmissions: [{ status: 'DRAFT' }],
        },
      };
      const result = evaluateCondition(
        {
          type: ConditionType.EXISTS_RELATED,
          relatedEntity: 'gateSubmissions',
          params: { minCount: 1, status: 'APPROVED' },
        },
        ctx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('APPROVALS_MET', () => {
    it('passes when enough approvals', () => {
      const ctx: ConditionContext = {
        ...baseCtx,
        relatedEntities: {
          approvals: [{ decision: 'APPROVED' }, { decision: 'APPROVED' }],
        },
      };
      const result = evaluateCondition(
        {
          type: ConditionType.APPROVALS_MET,
          params: { requiredCount: 2 },
        },
        ctx,
      );
      expect(result.passed).toBe(true);
    });

    it('fails when not enough approvals', () => {
      const ctx: ConditionContext = {
        ...baseCtx,
        relatedEntities: {
          approvals: [{ decision: 'APPROVED' }],
        },
      };
      const result = evaluateCondition(
        {
          type: ConditionType.APPROVALS_MET,
          params: { requiredCount: 2 },
        },
        ctx,
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('evaluateAllConditions', () => {
    it('evaluates all conditions and returns results', () => {
      const conditions: RuleCondition[] = [
        { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
        { type: ConditionType.REQUIRED_FIELD, field: 'nullField' },
      ];
      const results = evaluateAllConditions(conditions, baseCtx);
      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
    });
  });

  // CANON: an unknown condition type is cannot-determine (version skew, renamed
  // type, seed typo, replayed historical rule) — it may NEVER be a silent pass.
  describe('unknown condition type (CANON: indeterminate, never a pass)', () => {
    it('is indeterminate and NOT passed', () => {
      const result = evaluateCondition(
        { type: 'UNKNOWN_TYPE' as any },
        baseCtx,
      );
      expect(result.indeterminate).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Unknown condition type');
    });
  });

  // ── GOV-FIX-B1 CANON: cannot-determine is never a pass ─────────────────────
  // A rule whose input data is ABSENT must FAIL CLOSED or REFUSE TO EVALUATE —
  // never ALLOW on missing data. NaN/null/undefined are "cannot determine", not
  // "condition not met". This encodes the SILENT-ALLOW-ON-MISSING-FIELD defect
  // (risk-threshold-alert: 71 evaluations all ALLOW, openRiskCount never injected).
  describe('CANON: numeric condition on a MISSING field is INDETERMINATE', () => {
    const ctxMissing: ConditionContext = {
      entity: {}, // openRiskCount / activeTaskCount ABSENT
      actor: { userId: 'a', platformRole: 'ADMIN' },
    };

    it('NUMBER_GTE on an absent field is indeterminate, not a silent passed:false', () => {
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_GTE, field: 'openRiskCount', value: 10 } as RuleCondition,
        ctxMissing,
      );
      expect(result.indeterminate).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('NUMBER_LTE on an absent field is indeterminate', () => {
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_LTE, field: 'activeTaskCount', value: 15 } as RuleCondition,
        ctxMissing,
      );
      expect(result.indeterminate).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('a PRESENT numeric field is NOT indeterminate (normal evaluation intact)', () => {
      const result = evaluateCondition(
        { type: ConditionType.NUMBER_GTE, field: 'openRiskCount', value: 10 } as RuleCondition,
        { entity: { openRiskCount: 3 }, actor: { userId: 'a', platformRole: 'ADMIN' } },
      );
      expect(result.indeterminate).toBeFalsy();
      expect(result.passed).toBe(false); // 3 >= 10 is false, but DETERMINATE
    });
  });
});
