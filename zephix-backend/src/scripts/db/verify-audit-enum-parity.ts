/**
 * SEC-4 — Schema Parity gate: audit_events CHECK ↔ enum drift guard.
 *
 * Reads the LIVE, freshly-migrated CHK_audit_events_action /
 * CHK_audit_events_entity_type constraints and asserts parity against the
 * AuditAction / AuditEntityType enums (see audit-check-parity.ts for the two
 * directions + the shrink-only allowlist). Exits non-zero on any drift so the
 * Schema Parity CI gate turns the silent-swallow class into a red board.
 *
 * Run against the migrated parity DB in .github/workflows/schema-parity.yml.
 */
import 'reflect-metadata';
import { Client } from 'pg';
import { verifyAuditEnumParity } from '../../modules/audit/audit-check-parity';

async function readCheckValues(
  client: Client,
  constraintName: string,
): Promise<string[]> {
  const res = await client.query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [constraintName],
  );
  if (res.rows.length === 0) {
    throw new Error(`Constraint ${constraintName} not found on the migrated DB`);
  }
  const def: string = res.rows[0].def;
  // pg_get_constraintdef renders: ... IN ('a'::character varying, 'b'::...)
  const matches = def.match(/'([^']+)'::/g) || [];
  return matches.map((m) => m.slice(1, m.indexOf("'", 1)));
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const checkActions = await readCheckValues(client, 'CHK_audit_events_action');
    const checkEntities = await readCheckValues(
      client,
      'CHK_audit_events_entity_type',
    );
    console.log(
      `Audit parity: read ${checkActions.length} action + ${checkEntities.length} entity_type CHECK values`,
    );
    const result = verifyAuditEnumParity({ checkActions, checkEntities });
    if (result.ok) {
      console.log('✅ Audit enum ↔ CHECK parity holds (direction A strict + direction B allowlist).');
    } else {
      console.error(`❌ Audit enum ↔ CHECK parity FAILED — ${result.errors.length} issue(s):`);
      for (const e of result.errors) console.error(`   - ${e}`);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
