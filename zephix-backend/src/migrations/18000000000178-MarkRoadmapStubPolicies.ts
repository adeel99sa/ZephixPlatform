import { MigrationInterface, QueryRunner } from 'typeorm';

const SYSTEM_FILTER = `rule_set_id IN (SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM')`;

/**
 * A7 — mark the five stub governance rules as roadmap items.
 *
 * The five rules below were seeded in migration 071 with `conditions: []`
 * and a message ending in "(enforcement in a future release)". They are
 * visible in the admin UI today as if they were active policies but they
 * don't actually evaluate anything. Frontend wants to render them as a
 * "roadmap" badge instead of an enforcement toggle.
 *
 * This migration:
 *   1. Strips the "(enforcement in a future release)" parenthetical from
 *      `rule_definition.message` so the surface is honest about current
 *      behavior.
 *   2. Adds `rule_definition.roadmap = 'Q3-2026'` so the frontend can
 *      render the badge.
 *
 * Why JSONB-nested instead of a new `metadata` column on the table:
 *   - The schema's natural extension point for per-rule metadata is the
 *     existing `rule_definition` JSONB blob — that's already how
 *     `message`, `severity`, `conditions`, and `when` are stored.
 *   - The GET endpoint at `/admin/governance-rules/rule-sets/:id/rules`
 *     returns rule rows as-is, so a new field inside `rule_definition`
 *     reaches the frontend without controller changes.
 *   - Adding a dedicated `metadata` column would be schema churn for a
 *     single use case, and would also need a controller-level shape
 *     change to expose it.
 *
 * Scope:
 *   - SYSTEM-scoped rules only (matches the seed pattern in migration
 *     071). Per-org / per-workspace forks of these rules are not
 *     touched.
 *   - Updates `governance_rules.rule_definition` for all versions of the
 *     five `code` values; the migration is idempotent on re-run because
 *     `jsonb_set` is value-replacing and the message regex strip is a
 *     no-op once applied.
 *
 * Down: removes the `roadmap` key and restores the "(enforcement in a
 * future release)" parenthetical to the message strings.
 */
export class MarkRoadmapStubPolicies18000000000178
  implements MigrationInterface
{
  name = 'MarkRoadmapStubPolicies18000000000178';

  private readonly stubs: Array<{ code: string; canonicalMessage: string }> = [
    {
      code: 'wip-limits',
      canonicalMessage: 'Work in progress limit exceeded.',
    },
    {
      code: 'risk-threshold-alert',
      canonicalMessage: 'High-priority task threshold exceeded.',
    },
    {
      code: 'budget-threshold',
      canonicalMessage: 'Project budget threshold exceeded.',
    },
    {
      code: 'schedule-tolerance',
      canonicalMessage: 'Schedule variance escalation.',
    },
    {
      code: 'resource-capacity-governance',
      canonicalMessage: 'Resource allocation governance.',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { code, canonicalMessage } of this.stubs) {
      // Set message + roadmap atomically using jsonb_set composition.
      await queryRunner.query(
        `UPDATE governance_rules
         SET rule_definition = jsonb_set(
           jsonb_set(
             rule_definition,
             '{message}',
             to_jsonb($1::text),
             true
           ),
           '{roadmap}',
           to_jsonb($2::text),
           true
         )
         WHERE code = $3 AND ${SYSTEM_FILTER}`,
        [canonicalMessage, 'Q3-2026', code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const originalMessages: Record<string, string> = {
      'wip-limits':
        'Work in progress limit exceeded (enforcement in a future release).',
      'risk-threshold-alert':
        'High-priority task threshold exceeded (enforcement in a future release).',
      'budget-threshold':
        'Project budget threshold exceeded (enforcement in a future release).',
      'schedule-tolerance':
        'Schedule variance escalation (enforcement in a future release).',
      'resource-capacity-governance':
        'Resource allocation governance (enforcement in a future release).',
    };

    for (const code of Object.keys(originalMessages)) {
      await queryRunner.query(
        `UPDATE governance_rules
         SET rule_definition = (rule_definition - 'roadmap') || jsonb_build_object('message', $1::text)
         WHERE code = $2 AND ${SYSTEM_FILTER}`,
        [originalMessages[code], code],
      );
    }
  }
}
