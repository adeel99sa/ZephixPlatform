import { RemovePmbokGovernanceRuleSetDescriptions18000000000070 } from '../18000000000070-RemovePmbokGovernanceRuleSetDescriptions';

describe('Migration 18000000000070 — neutralize governance_rule_sets.description branding', () => {
  it('runs UPDATE on governance_rule_sets for legacy branded descriptions', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new RemovePmbokGovernanceRuleSetDescriptions18000000000070();
    await migration.up(mockQueryRunner as any);

    expect(queries.some((q) => q.includes('UPDATE governance_rule_sets'))).toBe(true);
    expect(queries.some((q) => q.includes('ILIKE'))).toBe(true);
    expect(queries.some((q) => /'%pmbok%'/i.test(q))).toBe(true);
  });

  it('down is a no-op', async () => {
    const mockQueryRunner = { query: jest.fn() };
    const migration = new RemovePmbokGovernanceRuleSetDescriptions18000000000070();
    await migration.down(mockQueryRunner as any);
    expect(mockQueryRunner.query).not.toHaveBeenCalled();
  });
});
