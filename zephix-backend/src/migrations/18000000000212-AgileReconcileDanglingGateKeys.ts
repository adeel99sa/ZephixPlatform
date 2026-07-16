import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AGILE-1 — reconcile the three dangling template gateKeys to canonical W2 codes.
 *
 * Hybrid + Release Planning templates carried gateKeys that resolved to NO W2
 * policy code — armed but ungoverned, invisible to the W2 admin surface. RULED
 * (reconcile, not delete):
 *   platform.gate.plan-to-deliver      -> platform.gate.plan-to-exec        (R1)
 *   platform.gate.deliver-to-close     -> platform.gate.monitor-to-closure  (R2)
 *   platform.gate.stabilize-to-deploy  -> platform.gate.exec-to-monitor     (R3)
 *
 * TWO carriers of the old keys, both reconciled here so deploy is self-contained
 * (no manual re-seed, no window where the R4 guard would reject Hybrid/Release
 * instantiation off a stale template row):
 *
 *  (1) phase_gate_definitions.gate_key — existing per-project gate rows. UPDATED
 *      in place. gate_approval_chains and phase_gate_submissions reference the
 *      definition by id (gate_definition_id), NEVER by gate_key, so every chain
 *      and submission survives the rename untouched — no orphaning.
 *  (2) templates.phases (JSONB) — the SYSTEM template rows instantiate reads from.
 *      Text-replace on the serialized array is safe: these gateKey strings are
 *      globally unique and appear only as gateKey values. The code seed
 *      (SYSTEM_TEMPLATE_DEFS) already carries the new keys, so a future re-seed
 *      is consistent/idempotent.
 *
 * LIVE-READ (staging, all orgs, 2026-07-15): (1) 3 gate-def rows (one per old
 * key, all Sandbox fixture org), ZERO submissions on them, 1 chain each (all
 * survive). (2) 2 SYSTEM templates carry old keys (Hybrid Project, Release
 * Planning Project), in `phases` only. Idempotent (WHERE-guarded, and REPLACE of
 * an absent substring is a no-op). Prod carries its own data — re-count before
 * promotion.
 */
export class AgileReconcileDanglingGateKeys18000000000212
  implements MigrationInterface
{
  name = 'AgileReconcileDanglingGateKeys18000000000212';

  private readonly remap: Array<[string, string]> = [
    ['platform.gate.plan-to-deliver', 'platform.gate.plan-to-exec'],
    ['platform.gate.deliver-to-close', 'platform.gate.monitor-to-closure'],
    ['platform.gate.stabilize-to-deploy', 'platform.gate.exec-to-monitor'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [oldKey, newKey] of this.remap) {
      // (1) per-project gate definitions
      await queryRunner.query(
        `UPDATE "phase_gate_definitions" SET "gate_key" = $1 WHERE "gate_key" = $2`,
        [newKey, oldKey],
      );
      // (2) template rows instantiate reads from (JSONB phases array)
      await queryRunner.query(
        `UPDATE "templates"
            SET "phases" = REPLACE("phases"::text, $2, $1)::jsonb
          WHERE "phases"::text LIKE '%' || $2 || '%'`,
        [newKey, oldKey],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reverse. Note: if a project legitimately had a canonical key
    // BEFORE this migration, down() cannot distinguish it from a reconciled one;
    // this is acceptable for a template-vocabulary fix (down is for local
    // rollback only, never run against shared data with real submissions).
    for (const [oldKey, newKey] of this.remap) {
      await queryRunner.query(
        `UPDATE "phase_gate_definitions" SET "gate_key" = $1 WHERE "gate_key" = $2`,
        [oldKey, newKey],
      );
      await queryRunner.query(
        `UPDATE "templates"
            SET "phases" = REPLACE("phases"::text, $2, $1)::jsonb
          WHERE "phases"::text LIKE '%' || $2 || '%'`,
        [oldKey, newKey],
      );
    }
  }
}
