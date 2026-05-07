import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenancy reconciliation R1: align projects.workspace_id DB constraint with
 * the TypeORM entity definition (which declares nullable: true).
 *
 * Background: WS-TENANCY-RECON Phase 0 surfaced that the test DB enforces
 * NOT NULL on projects.workspace_id while the entity at
 * src/modules/projects/entities/project.entity.ts:89-90 declares
 * `nullable: true`. Phase 0 grep across migrations did NOT find a migration
 * that explicitly set NOT NULL on this column — origin of the test-DB
 * constraint is unclear (likely residue from earlier synchronize:true dev
 * configuration that never got reflected in migrations).
 *
 * Architect Gate 2.5 decision: the entity is the source of truth. Realign
 * the DB to match the entity (nullable: true) rather than the reverse.
 * Future tightening to NOT NULL can land as deliberate work when
 * complexity_mode semantics finalize the workspace_id contract.
 *
 * No data migration needed — DROP NOT NULL is non-destructive on existing
 * rows.
 *
 * Reference: WS-TENANCY-EXEC fix dispatch, Commit 1 of 5.
 */
export class MakeProjectWorkspaceIdNullable18000000000101
  implements MigrationInterface
{
  name = 'MakeProjectWorkspaceIdNullable18000000000101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ALTER COLUMN "workspace_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NOTE: This down migration may fail if NULL rows exist in
    // projects.workspace_id at rollback time. If the rollback fires on data
    // that has accumulated NULL workspace_id values, run a backfill to
    // populate workspace_id for affected rows before retrying.
    await queryRunner.query(`
      ALTER TABLE "projects"
        ALTER COLUMN "workspace_id" SET NOT NULL
    `);
  }
}
