import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SKIP-1 (Type A) — actor column for the workspace_policies toggle receipt.
 *
 * `workspace_policies` records WHICH policy is on/off per workspace but never
 * WHO changed it — one of the actor-less governance holes (a governance state
 * change with no actor recorded is a canon violation: GOV-FIX-B1). The
 * accompanying audit_events row (GOVERNANCE_EVALUATE / governanceType
 * WORKSPACE_POLICY_TOGGLED) is the authoritative actor+before/after trail;
 * `updated_by` on the row itself is a convenience denormalization so the
 * current owner of a toggle is visible without a join.
 *
 * Additive, nullable, NO backfill — historical rows keep NULL (actor genuinely
 * unknown; we do not fabricate one). Idempotent (IF NOT EXISTS), no DROP.
 */
export class AddWorkspacePoliciesUpdatedBy18000000000210
  implements MigrationInterface
{
  name = 'AddWorkspacePoliciesUpdatedBy18000000000210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace_policies"
        ADD COLUMN IF NOT EXISTS "updated_by" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace_policies"
        DROP COLUMN IF EXISTS "updated_by"
    `);
  }
}
