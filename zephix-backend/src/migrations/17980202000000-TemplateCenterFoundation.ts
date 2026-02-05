import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Template Center Foundation: additive schema only.
 * Creates template_definitions, template_versions, template_policies, template_components,
 * kpi_definitions, project_kpis, kpi_values, doc_templates, document_instances,
 * document_versions, gate_approvals, template_lineage.
 * Extends audit_events for template-center events (old_state, new_state; nullable workspace_id/project_id).
 */
export class TemplateCenterFoundation17980202000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. template_definitions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_definitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        scope text NOT NULL,
        org_id uuid NULL,
        workspace_id uuid NULL,
        template_key text NOT NULL,
        name text NOT NULL,
        description text NULL,
        category text NULL,
        is_prebuilt boolean NOT NULL DEFAULT false,
        is_admin_default boolean NOT NULL DEFAULT false,
        created_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_template_definitions_scope_org_ws_key
      ON template_definitions (scope, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), template_key);
    `);

    // 2. template_versions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_definition_id uuid NOT NULL,
        version int NOT NULL,
        status text NOT NULL,
        changelog text NULL,
        published_at timestamptz NULL,
        published_by uuid NULL,
        schema jsonb NOT NULL,
        hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_def_version
      ON template_versions (template_definition_id, version);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_versions_def_status
      ON template_versions (template_definition_id, status);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE template_versions
      ADD CONSTRAINT fk_template_versions_definition
      FOREIGN KEY (template_definition_id) REFERENCES template_definitions(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 3. template_policies
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_version_id uuid NOT NULL,
        policy_key text NOT NULL,
        policy_type text NOT NULL,
        policy jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_policies_version
      ON template_policies (template_version_id);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE template_policies
      ADD CONSTRAINT fk_template_policies_version
      FOREIGN KEY (template_version_id) REFERENCES template_versions(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 4. template_components
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_components (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_version_id uuid NOT NULL,
        component_type text NOT NULL,
        component_key text NOT NULL,
        name text NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_template_components_version_type_key
      ON template_components (template_version_id, component_type, component_key);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE template_components
      ADD CONSTRAINT fk_template_components_version
      FOREIGN KEY (template_version_id) REFERENCES template_versions(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 5. kpi_definitions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_definitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kpi_key text NOT NULL,
        name text NOT NULL,
        category text NOT NULL,
        unit text NOT NULL,
        direction text NOT NULL,
        rollup_method text NOT NULL,
        weight_field text NULL,
        time_window text NOT NULL,
        formula jsonb NULL,
        thresholds jsonb NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_definitions_key ON kpi_definitions (kpi_key);
    `);

    // 6. project_kpis
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_kpis (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        kpi_definition_id uuid NOT NULL,
        is_required boolean NOT NULL DEFAULT false,
        source text NOT NULL DEFAULT 'manual',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_kpis_project_kpi
      ON project_kpis (project_id, kpi_definition_id);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE project_kpis
      ADD CONSTRAINT fk_project_kpis_definition
      FOREIGN KEY (kpi_definition_id) REFERENCES kpi_definitions(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 7. kpi_values (append-only)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_values (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_kpi_id uuid NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT now(),
        value numeric NULL,
        value_text text NULL,
        metadata jsonb NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_values_project_kpi_recorded
      ON kpi_values (project_kpi_id, recorded_at DESC);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE kpi_values
      ADD CONSTRAINT fk_kpi_values_project_kpi
      FOREIGN KEY (project_kpi_id) REFERENCES project_kpis(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 8. doc_templates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS doc_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_key text NOT NULL,
        name text NOT NULL,
        category text NOT NULL,
        content_type text NOT NULL,
        default_content jsonb NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_templates_key ON doc_templates (doc_key);
    `);

    // 9. document_instances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        doc_template_id uuid NULL,
        doc_key text NOT NULL,
        name text NOT NULL,
        content_type text NOT NULL,
        status text NOT NULL,
        owner_id uuid NOT NULL,
        reviewer_ids uuid[] NOT NULL DEFAULT '{}',
        phase_key text NULL,
        due_date date NULL,
        completed_at timestamptz NULL,
        completed_by uuid NULL,
        current_version int NOT NULL DEFAULT 1,
        is_required boolean NOT NULL DEFAULT false,
        blocks_gate_key text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_instances_project_status
      ON document_instances (project_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_instances_project_doc_key
      ON document_instances (project_id, doc_key);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE document_instances
      ADD CONSTRAINT fk_document_instances_template
      FOREIGN KEY (doc_template_id) REFERENCES doc_templates(id) ON DELETE SET NULL
    `,
      )
      .catch(() => {});

    // 10. document_versions (append-only)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_instance_id uuid NOT NULL,
        version_number int NOT NULL,
        content jsonb NULL,
        file_storage_key text NULL,
        file_hash text NULL,
        external_url text NULL,
        form_data jsonb NULL,
        change_summary text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid NOT NULL
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_instance_version
      ON document_versions (document_instance_id, version_number);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE document_versions
      ADD CONSTRAINT fk_document_versions_instance
      FOREIGN KEY (document_instance_id) REFERENCES document_instances(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 11. gate_approvals
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        gate_key text NOT NULL,
        decision text NOT NULL,
        comment text NULL,
        evidence jsonb NULL,
        decided_by uuid NOT NULL,
        decided_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_approvals_project_gate_decided
      ON gate_approvals (project_id, gate_key, decided_at DESC);
    `);

    // 12. template_lineage
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_lineage (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        template_definition_id uuid NOT NULL,
        template_version_id uuid NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now(),
        applied_by uuid NOT NULL,
        upgrade_state text NOT NULL DEFAULT 'none',
        upgrade_notes text NULL
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_template_lineage_project
      ON template_lineage (project_id);
    `);
    await queryRunner
      .query(
        `
      ALTER TABLE template_lineage
      ADD CONSTRAINT fk_template_lineage_definition
      FOREIGN KEY (template_definition_id) REFERENCES template_definitions(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});
    await queryRunner
      .query(
        `
      ALTER TABLE template_lineage
      ADD CONSTRAINT fk_template_lineage_version
      FOREIGN KEY (template_version_id) REFERENCES template_versions(id) ON DELETE CASCADE
    `,
      )
      .catch(() => {});

    // 13. Extend audit_events for template-center (V2 shape + org-level events)
    await queryRunner
      .query(
        `
      ALTER TABLE audit_events
      ADD COLUMN IF NOT EXISTS old_state jsonb NULL
    `,
      )
      .catch(() => {});
    await queryRunner
      .query(
        `
      ALTER TABLE audit_events
      ADD COLUMN IF NOT EXISTS new_state jsonb NULL
    `,
      )
      .catch(() => {});
    await queryRunner
      .query(
        `
      ALTER TABLE audit_events
      ALTER COLUMN workspace_id DROP NOT NULL
    `,
      )
      .catch(() => {});
    await queryRunner
      .query(
        `
      ALTER TABLE audit_events
      ALTER COLUMN project_id DROP NOT NULL
    `,
      )
      .catch(() => {});
    await queryRunner
      .query(
        `
      ALTER TABLE audit_events
      ALTER COLUMN entity_id DROP NOT NULL
    `,
      )
      .catch(() => {});
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner
      .query(`ALTER TABLE audit_events ALTER COLUMN entity_id SET NOT NULL`)
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE audit_events ALTER COLUMN project_id SET NOT NULL`)
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE audit_events ALTER COLUMN workspace_id SET NOT NULL`)
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE audit_events DROP COLUMN IF EXISTS new_state`)
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE audit_events DROP COLUMN IF EXISTS old_state`)
      .catch(() => {});

    await queryRunner.query(`DROP TABLE IF EXISTS template_lineage`);
    await queryRunner.query(`DROP TABLE IF EXISTS gate_approvals`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_instances`);
    await queryRunner.query(`DROP TABLE IF EXISTS doc_templates`);
    await queryRunner.query(`DROP TABLE IF EXISTS kpi_values`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_kpis`);
    await queryRunner.query(`DROP TABLE IF EXISTS kpi_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_components`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_policies`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_definitions`);
  }
}
