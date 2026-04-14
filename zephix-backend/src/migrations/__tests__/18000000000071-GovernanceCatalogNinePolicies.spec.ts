import { GovernanceCatalogNinePolicies18000000000071 } from '../18000000000071-GovernanceCatalogNinePolicies';
import { GovernanceRuleSet } from '../../modules/governance-rules/entities/governance-rule-set.entity';
import { GovernanceRule } from '../../modules/governance-rules/entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from '../../modules/governance-rules/entities/governance-rule-active-version.entity';

describe('Migration 18000000000071 — nine-policy SYSTEM catalog alignment', () => {
  it('runs scoped UPDATEs for known catalog codes', async () => {
    const mockQueryRunner = {
      query: jest.fn(async () => undefined),
      manager: {
        getRepository: jest.fn(),
      },
    };

    const mockProjectSet = { id: 'proj-set-1' };
    const setRepo = {
      findOne: jest.fn().mockResolvedValue(mockProjectSet),
    };
    const ruleRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x: unknown) => x),
      save: jest.fn().mockResolvedValue({ id: 'new-rule' }),
    };
    const avRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x: unknown) => x),
      save: jest.fn().mockResolvedValue({}),
    };

    (mockQueryRunner.manager.getRepository as jest.Mock).mockImplementation(
      (Entity: unknown) => {
        if (Entity === GovernanceRuleSet) return setRepo;
        if (Entity === GovernanceRule) return ruleRepo;
        if (Entity === GovernanceRuleActiveVersion) return avRepo;
        return {};
      },
    );

    const migration = new GovernanceCatalogNinePolicies18000000000071();
    await migration.up(mockQueryRunner as any);

    const calls = (mockQueryRunner.query as jest.Mock).mock.calls as unknown[][];
    expect(calls.some((c) => Array.isArray(c[1]) && c[1][1] === 'scope-change-control')).toBe(
      true,
    );
    expect(calls.some((c) => String(c[0]).includes('mandatory-fields'))).toBe(true);
    expect(setRepo.findOne).toHaveBeenCalled();
  });
});
