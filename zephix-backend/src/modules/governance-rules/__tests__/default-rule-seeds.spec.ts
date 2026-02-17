import { SYSTEM_RULE_SEEDS } from '../engine/default-rule-seeds';
import { ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ConditionType, ConditionSeverity } from '../entities/governance-rule.entity';

describe('System Rule Seeds', () => {
  it('has exactly 3 system rule sets', () => {
    expect(SYSTEM_RULE_SEEDS).toHaveLength(3);
  });

  it('all seeds use SYSTEM scope', () => {
    for (const seed of SYSTEM_RULE_SEEDS) {
      expect(seed.scopeType).toBe(ScopeType.SYSTEM);
    }
  });

  it('all seeds default to enforcement OFF', () => {
    for (const seed of SYSTEM_RULE_SEEDS) {
      expect(seed.enforcementMode).toBe(EnforcementMode.OFF);
    }
  });

  it('all rules have valid codes', () => {
    for (const seed of SYSTEM_RULE_SEEDS) {
      for (const rule of seed.rules) {
        expect(rule.code).toBeTruthy();
        expect(rule.code).toMatch(/^[A-Z_]+$/);
      }
    }
  });

  it('all rules have valid condition types', () => {
    const validTypes = Object.values(ConditionType);
    for (const seed of SYSTEM_RULE_SEEDS) {
      for (const rule of seed.rules) {
        for (const cond of rule.ruleDefinition.conditions) {
          expect(validTypes).toContain(cond.type);
        }
      }
    }
  });

  it('all rules have valid severity', () => {
    const validSeverities = Object.values(ConditionSeverity);
    for (const seed of SYSTEM_RULE_SEEDS) {
      for (const rule of seed.rules) {
        expect(validSeverities).toContain(rule.ruleDefinition.severity);
      }
    }
  });

  it('all rules have a message', () => {
    for (const seed of SYSTEM_RULE_SEEDS) {
      for (const rule of seed.rules) {
        expect(rule.ruleDefinition.message).toBeTruthy();
      }
    }
  });

  it('task rules have when.toStatus set', () => {
    const taskSeed = SYSTEM_RULE_SEEDS.find(
      (s) => s.entityType === 'TASK',
    );
    expect(taskSeed).toBeDefined();
    for (const rule of taskSeed!.rules) {
      expect(rule.ruleDefinition.when?.toStatus).toBeTruthy();
    }
  });

  it('rule codes are unique across all seeds', () => {
    const allCodes: string[] = [];
    for (const seed of SYSTEM_RULE_SEEDS) {
      for (const rule of seed.rules) {
        allCodes.push(rule.code);
      }
    }
    expect(new Set(allCodes).size).toBe(allCodes.length);
  });

  it('total MVP rule count is 7', () => {
    let count = 0;
    for (const seed of SYSTEM_RULE_SEEDS) {
      count += seed.rules.length;
    }
    expect(count).toBe(7);
  });
});
