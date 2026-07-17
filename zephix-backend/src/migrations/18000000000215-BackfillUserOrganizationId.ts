import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AUTH-MISMATCH-2 — backfill users.organization_id from the single
 * user_organizations link, for users the old org-signup path left with a NULL
 * column.
 *
 * Root cause (fixed at source in organization-signup.service.ts, same PR): the
 * org-signup path linked a user to its org ONLY via the user_organizations join
 * table and never set users.organization_id. login() reads the COLUMN
 * (createLoginResult -> USER_MISSING_ORGANIZATION), so those users were locked
 * out on their next login — the gate that actually bit in the wild, masking the
 * AUTH-MISMATCH-1 argon2 hash bug stacked on the same rows.
 *
 * THREE CASES (staging live-read 2026-07-17, host 10.250.17.120):
 *   (a) NULL column + exactly ONE link      = 8 users  -> BACKFILL (this migration)
 *   (b) NULL column + MULTIPLE links         = 0 users  -> SKIP + log. No single
 *       correct value: users.organization_id is the login-default/home org
 *       (JWT-baked, not mutated on switch); the only "home" signal is
 *       role='owner'. Never guess — writing an arbitrary org silently
 *       mis-scopes a multi-org user, a worse bug than the lockout.
 *   (c) NULL column + ZERO links             = 0 users  -> SKIP + log. A
 *       different orphan (signup that failed mid-write, now impossible since the
 *       signup fix wraps user+org+link in one transaction). NOT an AM-2 victim.
 *
 * IDEMPOTENT: the `organization_id IS NULL AND exactly-one-link` predicate makes
 * a re-run a zero-row no-op. Auto-runs on staging now; rides the migration chain
 * to clean prod at cutover (no separate manual prod step). Prod a/b/c counts
 * fold into the PROD-DECOM prod-read trip — a report line, not a gate.
 */
export class BackfillUserOrganizationId18000000000215
  implements MigrationInterface
{
  name = 'BackfillUserOrganizationId18000000000215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Surface the three-case counts before touching anything (count-first).
    const [counts] = await queryRunner.query(`
      WITH nulls AS (
        SELECT u.id, count(uo.user_id) AS links
        FROM users u
        LEFT JOIN user_organizations uo ON uo.user_id = u.id
        WHERE u.organization_id IS NULL
        GROUP BY u.id
      )
      SELECT
        count(*) FILTER (WHERE links = 1) AS case_a_one_link,
        count(*) FILTER (WHERE links > 1) AS case_b_multi_link,
        count(*) FILTER (WHERE links = 0) AS case_c_zero_link
      FROM nulls;
    `);
    // eslint-disable-next-line no-console
    console.log(
      `[AM-2 backfill] pre-run null-org buckets: (a) single-link=${counts.case_a_one_link} ` +
        `(b) multi-link=${counts.case_b_multi_link} (SKIPPED, never guessed) ` +
        `(c) zero-link=${counts.case_c_zero_link} (SKIPPED, orphans)`,
    );

    // Backfill ONLY the clean single-link case. Multi-link excluded by
    // HAVING count(*)=1; zero-link excluded by not appearing in the subquery;
    // already-set rows excluded by organization_id IS NULL.
    const result = await queryRunner.query(`
      UPDATE users u
      SET organization_id = sub.org_id
      FROM (
        -- array_agg (not MAX): Postgres has no max() aggregate for uuid.
        -- HAVING count(*)=1 guarantees exactly one element, so [1] is the org.
        SELECT uo.user_id, (array_agg(uo.organization_id))[1] AS org_id
        FROM user_organizations uo
        GROUP BY uo.user_id
        HAVING count(*) = 1
      ) sub
      WHERE u.id = sub.user_id
        AND u.organization_id IS NULL
      RETURNING u.id;
    `);
    const backfilled = Array.isArray(result) ? result.length : 0;
    // eslint-disable-next-line no-console
    console.log(`[AM-2 backfill] backfilled ${backfilled} single-link user(s).`);
  }

  public async down(): Promise<void> {
    // No-op: setting organization_id back to NULL would re-break login for these
    // users. The column is now correctly populated from the join-link; there is
    // nothing safe to reverse.
  }
}
