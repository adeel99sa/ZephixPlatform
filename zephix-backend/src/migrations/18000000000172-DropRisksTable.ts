import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WS-CLEANUP-SCHEMA-DROP-01 — Drop abandoned `risks` table.
 *
 * Context:
 *   - Prior recon (WS-DUPLICATION-RECON-01) confirmed via dual-agent
 *     exhaustive grep: zero active writers on `risks`. Canonical replacement
 *     is `work_risks` (workspace-aware, tenant-scoped).
 *   - Migration 18000000000074 backfilled legacy `risks` rows into
 *     `work_risks` with `legacy_risk_id` traceability. This drop runs AFTER
 *     074 in the migration chain (timestamp ordering), preserving the
 *     fresh-DB sequence: create (1786000000003) → backfill (074) → drop.
 *   - Stale comments in `1786000000003-CreateRisksTable.ts` and the legacy
 *     `Risk` entity files claimed active consumers exist (e.g.,
 *     `portfolio-kpi-rollup.service`). Verified at Phase 0 to be stale:
 *     the cited service injects `WorkRisk`, not `Risk`.
 *
 * Superseded by: `work_risks` (zero writers on `risks` confirmed).
 *
 * Down: forward-only cleanup. The reverse path does not recreate the table
 * — restoration would require replaying 1786000000003 and 074.
 */
export class DropRisksTable18000000000172 implements MigrationInterface {
  name = 'DropRisksTable18000000000172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "risks" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Forward-only cleanup; intentional no-op. To restore, re-run
    // 1786000000003-CreateRisksTable then 18000000000074-AddRiskCanonicalizationMetadata.
  }
}
