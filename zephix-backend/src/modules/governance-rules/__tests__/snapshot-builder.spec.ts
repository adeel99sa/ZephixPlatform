import { extractRequiredFields, buildInputsSnapshot } from '../engine/snapshot-builder';
import { ConditionType, ConditionSeverity } from '../entities/governance-rule.entity';
import { ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ResolvedRule } from '../services/governance-rule-resolver.service';

function makeRule(fields: string[]): ResolvedRule {
  return {
    ruleSetId: 'rs-1',
    ruleSetName: 'Test',
    enforcementMode: EnforcementMode.BLOCK,
    scopeType: ScopeType.SYSTEM,
    ruleId: 'rule-1',
    code: 'TEST',
    version: 1,
    ruleDefinition: {
      conditions: fields.map((f) => ({
        type: ConditionType.REQUIRED_FIELD,
        field: f,
      })),
      message: 'Test',
      severity: ConditionSeverity.ERROR,
    },
  };
}

describe('extractRequiredFields', () => {
  it('extracts field names from conditions', () => {
    const rules = [makeRule(['assigneeUserId', 'acceptanceCriteria'])];
    const fields = extractRequiredFields(rules);
    expect(fields).toEqual(new Set(['assigneeUserId', 'acceptanceCriteria']));
  });

  it('deduplicates fields across rules', () => {
    const rules = [
      makeRule(['assigneeUserId']),
      makeRule(['assigneeUserId', 'startDate']),
    ];
    const fields = extractRequiredFields(rules);
    expect(fields.size).toBe(2);
    expect(fields.has('assigneeUserId')).toBe(true);
    expect(fields.has('startDate')).toBe(true);
  });

  it('returns empty set for ROLE_ALLOWED conditions', () => {
    const rule: ResolvedRule = {
      ...makeRule([]),
      ruleDefinition: {
        conditions: [{ type: ConditionType.ROLE_ALLOWED, params: { roles: ['ADMIN'] } }],
        message: 'Test',
        severity: ConditionSeverity.ERROR,
      },
    };
    const fields = extractRequiredFields([rule]);
    expect(fields.size).toBe(0);
  });
});

describe('buildInputsSnapshot', () => {
  it('includes only condition-referenced fields', () => {
    const snapshot = buildInputsSnapshot({
      entityId: 'task-1',
      entityType: 'TASK',
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: {
        assigneeUserId: 'user-1',
        title: 'Do not include this',
        description: 'Large text that should be excluded',
        acceptanceCriteria: 'AC filled',
      },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      requiredFields: new Set(['assigneeUserId', 'acceptanceCriteria']),
    });

    expect(snapshot.entityFields.assigneeUserId).toBe('user-1');
    expect(snapshot.entityFields.acceptanceCriteria).toBe('AC filled');
    expect(snapshot.entityFields.title).toBeUndefined();
    expect(snapshot.entityFields.description).toBeUndefined();
  });

  it('always includes identity context', () => {
    const snapshot = buildInputsSnapshot({
      entityId: 'task-1',
      entityType: 'TASK',
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      entity: {},
      actor: { userId: 'actor-1', platformRole: 'ADMIN' },
      requiredFields: new Set(),
    });

    expect(snapshot.entityId).toBe('task-1');
    expect(snapshot.entityType).toBe('TASK');
    expect(snapshot.fromValue).toBe('TODO');
    expect(snapshot.toValue).toBe('IN_PROGRESS');
    expect(snapshot.actorUserId).toBe('actor-1');
  });

  it('enforces 16 KB cap by truncating large strings', () => {
    const largeText = 'x'.repeat(20_000);
    const snapshot = buildInputsSnapshot({
      entityId: 'task-1',
      entityType: 'TASK',
      fromValue: null,
      toValue: 'DONE',
      entity: { bigField: largeText },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      requiredFields: new Set(['bigField']),
    });

    const json = JSON.stringify(snapshot);
    expect(json.length).toBeLessThanOrEqual(16 * 1024);
    expect(snapshot.entityFields.bigField).toContain('[truncated]');
  });

  it('handles extreme case by stripping entityFields entirely', () => {
    const fields: Record<string, string> = {};
    const requiredFields = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const key = `field_${i}`;
      fields[key] = 'x'.repeat(500);
      requiredFields.add(key);
    }

    const snapshot = buildInputsSnapshot({
      entityId: 'task-1',
      entityType: 'TASK',
      fromValue: null,
      toValue: 'DONE',
      entity: fields,
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      requiredFields,
    });

    const json = JSON.stringify(snapshot);
    expect(json.length).toBeLessThanOrEqual(16 * 1024);
  });
});
