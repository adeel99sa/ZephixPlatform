import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Expand the audit_events entity_type CHECK constraint to include
 * domain-specific entity types used by the work-management module.
 *
 * The Phase 3B migration only allowed lowercase entity types
 * (work_task, work_risk, etc.) but work-phases.service writes
 * entityType: 'PHASE', causing a CHECK constraint violation.
 */
export class ExpandAuditEntityTypeConstraint17980245000000
  implements MigrationInterface
{
  name = 'ExpandAuditEntityTypeConstraint17980245000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing entity_type CHECK constraint
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_entity_type";
    `);

    // Recreate with expanded set including domain-specific types
    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_entity_type"
        CHECK (entity_type IN (
          -- Original Phase 3B entity types (lowercase)
          'organization','workspace','project','portfolio',
          'work_task','work_risk','doc','attachment',
          'scenario_plan','scenario_action','scenario_result',
          'baseline','capacity_calendar','billing_plan',
          'entitlement','webhook','board_move',
          -- Domain-specific entity types (UPPER for work-management module)
          'PHASE','TASK','SPRINT','RISK','ALLOCATION',
          'CHANGE_REQUEST','DOCUMENT','BUDGET','GATE','POLICY',
          'TEMPLATE','TEMPLATE_ACTIVATION','TAILORING_PROFILE'
        ));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_entity_type";
    `);
    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_entity_type"
        CHECK (entity_type IN (
          'organization','workspace','project','portfolio',
          'work_task','work_risk','doc','attachment',
          'scenario_plan','scenario_action','scenario_result',
          'baseline','capacity_calendar','billing_plan',
          'entitlement','webhook','board_move'
        ));
    `);
  }
}
