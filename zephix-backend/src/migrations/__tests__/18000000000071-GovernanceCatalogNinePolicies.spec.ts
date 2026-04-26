import { GovernanceCatalogNinePolicies18000000000071 } from '../18000000000071-GovernanceCatalogNinePolicies';

describe('Migration 18000000000071 — nine-policy SYSTEM catalog alignment', () => {
  it('runs scoped raw SQL updates and PROJECT catalog rule upserts', async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
      }),
    };

    const migration = new GovernanceCatalogNinePolicies18000000000071();
    await migration.up(mockQueryRunner as any);

    expect(
      queries.some((q) => q.params[1] === 'scope-change-control'),
    ).toBe(true);
    expect(queries.some((q) => q.sql.includes('mandatory-fields'))).toBe(
      true,
    );

    const projectRuleUpserts = queries.filter(
      (q) =>
        q.sql.includes('INSERT INTO governance_rules') &&
        q.sql.includes("entity_type = 'PROJECT'") &&
        q.sql.includes("scope_type = 'SYSTEM'"),
    );
    expect(projectRuleUpserts).toHaveLength(2);
    expect(projectRuleUpserts.map((q) => q.params[0])).toEqual([
      'schedule-tolerance',
      'resource-capacity-governance',
    ]);

    expect(
      queries.some((q) =>
        q.sql.includes('ON CONFLICT (rule_set_id, code)'),
      ),
    ).toBe(true);
  });
});
