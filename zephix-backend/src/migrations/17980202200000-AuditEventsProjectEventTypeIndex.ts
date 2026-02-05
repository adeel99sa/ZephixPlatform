import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit events: index for triage by project_id and event_type (e.g. TEMPLATE_APPLY_FAILED, GATE_DECIDE_BLOCKED).
 */
export class AuditEventsProjectEventTypeIndex17980202200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_project_event_type
      ON audit_events (project_id, event_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_audit_events_project_event_type`,
    );
  }
}
