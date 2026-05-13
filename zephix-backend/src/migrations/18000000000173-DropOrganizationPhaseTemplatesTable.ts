import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WS-CLEANUP-SCHEMA-DROP-01 — Drop abandoned `organization_phase_templates` table.
 *
 * Context:
 *   - Prior recon (WS-DUPLICATION-RECON-01) confirmed: zero entity files,
 *     zero services, zero writers, zero reader code paths on this table.
 *     Only references in the codebase are the original creator migration
 *     (1757227595839-AddProjectPhases.ts) and its own `DROP TABLE` in the
 *     reverse migration.
 *   - No entity file ever shipped against this table; it was never wired
 *     into the running application.
 *
 * Down: forward-only cleanup. No restoration path.
 */
export class DropOrganizationPhaseTemplatesTable18000000000173
  implements MigrationInterface
{
  name = 'DropOrganizationPhaseTemplatesTable18000000000173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "organization_phase_templates" CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Forward-only cleanup; intentional no-op.
  }
}
