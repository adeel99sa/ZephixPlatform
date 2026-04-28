import { AddRiskCanonicalizationMetadata18000000000074 } from '../18000000000074-AddRiskCanonicalizationMetadata';

describe('Migration 18000000000074 — risk canonicalization metadata', () => {
  async function runUp() {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AddRiskCanonicalizationMetadata18000000000074();
    await migration.up(mockQueryRunner as any);

    return { queries, mockQueryRunner };
  }

  it('adds additive metadata columns to work_risks', async () => {
    const { queries } = await runUp();
    const alter = queries.find((sql) =>
      sql.includes('ALTER TABLE "work_risks"'),
    );

    expect(alter).toContain('ADD COLUMN IF NOT EXISTS "source"');
    expect(alter).toContain('ADD COLUMN IF NOT EXISTS "risk_type"');
    expect(alter).toContain('ADD COLUMN IF NOT EXISTS "evidence" JSONB');
    expect(alter).toContain('ADD COLUMN IF NOT EXISTS "detected_at"');
    expect(alter).toContain('ADD COLUMN IF NOT EXISTS "legacy_risk_id" UUID');
  });

  it('creates partial indexes for traceability metadata', async () => {
    const { queries } = await runUp();

    expect(
      queries.some((sql) =>
        sql.includes(
          'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_work_risks_legacy_risk_id"',
        ),
      ),
    ).toBe(true);
    expect(
      queries.some((sql) => sql.includes('WHERE "legacy_risk_id" IS NOT NULL')),
    ).toBe(true);
    expect(
      queries.some((sql) =>
        sql.includes('CREATE INDEX IF NOT EXISTS "IDX_work_risks_source"'),
      ),
    ).toBe(true);
  });

  it('backfills only safely mappable legacy risks and preserves legacy rows', async () => {
    const { queries } = await runUp();
    const backfill = queries.find((sql) => sql.includes('WITH inserted AS'));

    expect(backfill).toContain('INSERT INTO "work_risks"');
    expect(backfill).toContain('FROM "risks" r');
    expect(backfill).toContain('JOIN "projects" p');
    expect(backfill).toContain('p."workspace_id" IS NOT NULL');
    expect(backfill).toContain(
      'p."organization_id"::text = r."organization_id"::text',
    );
    expect(backfill).toContain('WHERE wr."legacy_risk_id" = r."id"');
    expect(backfill).not.toMatch(/DELETE\s+FROM\s+"risks"/i);
    expect(backfill).not.toMatch(/DROP\s+TABLE\s+"risks"/i);
  });

  it('normalizes legacy severity and status values into WorkRisk enums', async () => {
    const { queries } = await runUp();
    const backfill = queries.find((sql) => sql.includes('WITH inserted AS'));

    expect(backfill).toContain("WHEN 'CRITICAL' THEN 'CRITICAL'");
    expect(backfill).toContain("ELSE 'MEDIUM'");
    expect(backfill).toContain("WHEN 'ACTIVE' THEN 'OPEN'");
    expect(backfill).toContain("WHEN 'RESOLVED' THEN 'CLOSED'");
    expect(backfill).toContain("ELSE 'OPEN'");
  });

  it('contains automated verification gates for non-destructive migration safety', async () => {
    const { queries } = await runUp();
    const backfill = queries.find((sql) => sql.includes('WITH inserted AS'));

    expect(backfill).toContain('Risk canonicalization pre-check');
    expect(backfill).toContain('Risk canonicalization post-check');
    expect(backfill).toContain('post_risks_count != pre_risks_count');
    expect(backfill).toContain('migrated_without_workspace_count != 0');
    expect(backfill).toContain('RAISE EXCEPTION');
  });

  it('down removes only migrated copies and metadata added by this migration', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AddRiskCanonicalizationMetadata18000000000074();
    await migration.down(mockQueryRunner as any);

    expect(
      queries.some(
        (sql) =>
          sql.includes('DELETE FROM "work_risks"') &&
          sql.includes('"legacy_risk_id" IS NOT NULL'),
      ),
    ).toBe(true);
    expect(
      queries.some((sql) =>
        sql.includes('DROP INDEX IF EXISTS "IDX_work_risks_source"'),
      ),
    ).toBe(true);
    expect(
      queries.some((sql) =>
        sql.includes('DROP INDEX IF EXISTS "IDX_work_risks_legacy_risk_id"'),
      ),
    ).toBe(true);
    expect(
      queries.some((sql) =>
        sql.includes('DROP COLUMN IF EXISTS "legacy_risk_id"'),
      ),
    ).toBe(true);
    expect(
      queries.some((sql) => sql.includes('DROP COLUMN IF EXISTS "source"')),
    ).toBe(true);
    expect(queries.join('\n')).not.toMatch(/DROP\s+TABLE\s+"risks"/i);
    expect(queries.join('\n')).not.toMatch(/DELETE\s+FROM\s+"risks"/i);
  });
});
