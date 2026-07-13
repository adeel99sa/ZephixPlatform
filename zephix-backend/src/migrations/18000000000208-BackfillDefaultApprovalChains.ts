import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GATE-SUB-2 — backfill the default one-step ADMIN approval chain for every
 * ACTIVE phase gate definition that has no active chain.
 *
 * Live-read 2026-07-13: 34 ACTIVE gate defs across all orgs, ALL 34 with no
 * chain → every gate in every org is currently un-approvable. This closes the
 * existing hole; new gate defs get their chain at creation time (instantiate +
 * clone).
 *
 * Idempotent + additive (no DROP): both inserts are guarded by NOT EXISTS, so a
 * re-run is a no-op. created_by_user_id is carried from the gate def (NOT NULL).
 * The step's required_role='ADMIN' — a wildcard approver; the self-approve ban
 * and the zero-eligible-approver blocker still apply at evaluate-time.
 */
export class BackfillDefaultApprovalChains18000000000208
  implements MigrationInterface
{
  name = 'BackfillDefaultApprovalChains18000000000208';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. One default chain per ACTIVE gate def that has none.
    await queryRunner.query(`
      INSERT INTO gate_approval_chains
        (id, organization_id, workspace_id, gate_definition_id, name,
         is_active, created_by_user_id, created_at, updated_at)
      SELECT gen_random_uuid(), d.organization_id, d.workspace_id, d.id,
             'Default approval', true, d.created_by_user_id, now(), now()
      FROM phase_gate_definitions d
      WHERE d.status = 'ACTIVE'
        AND d.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM gate_approval_chains c
          WHERE c.gate_definition_id = d.id
            AND c.deleted_at IS NULL
            AND c.is_active = true
        )
    `);

    // 2. One ADMIN step for each default chain that has no steps yet.
    await queryRunner.query(`
      INSERT INTO gate_approval_chain_steps
        (id, organization_id, chain_id, step_order, name, required_role,
         approval_type, min_approvals, created_at, updated_at)
      SELECT gen_random_uuid(), c.organization_id, c.id, 1, 'Admin approval',
             'ADMIN', 'ANY_ONE', 1, now(), now()
      FROM gate_approval_chains c
      WHERE c.name = 'Default approval'
        AND c.is_active = true
        AND c.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM gate_approval_chain_steps s WHERE s.chain_id = c.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove only the backfilled default chains (steps cascade via FK).
    await queryRunner.query(`
      DELETE FROM gate_approval_chains
      WHERE name = 'Default approval'
        AND created_by_user_id IN (
          SELECT created_by_user_id FROM phase_gate_definitions
        )
    `);
  }
}
