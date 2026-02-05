import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Template Center: indexes for performance and predictable query plans.
 */
export class TemplateCenterIndexes17980202100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_definitions_org_ws_key
      ON template_definitions (org_id, workspace_id, template_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_versions_def_version
      ON template_versions (template_definition_id, version)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_lineage_project_applied
      ON template_lineage (project_id, applied_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_doc_templates_key
      ON doc_templates (doc_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_instances_project_doc_key
      ON document_instances (project_id, doc_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_instance_version
      ON document_versions (document_instance_id, version_number)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_key
      ON kpi_definitions (kpi_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_kpis_project
      ON project_kpis (project_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_values_project_kpi_recorded
      ON kpi_values (project_kpi_id, recorded_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_approvals_project_gate_decided
      ON gate_approvals (project_id, gate_key, decided_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gate_approvals_project_gate_decided`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_kpi_values_project_kpi_recorded`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_kpis_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kpi_definitions_key`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_document_versions_instance_version`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_document_instances_project_doc_key`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_doc_templates_key`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_template_lineage_project_applied`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_template_versions_def_version`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_template_definitions_org_ws_key`,
    );
  }
}
