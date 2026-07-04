import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 1 Track A — Attribute Engine
 *
 * Authority: AD-024 (three-tier EAV schema) + AD-016 rulings 1-4:
 *   1. No `tier` column — scope is the single authority axis
 *   2. organization_id nullable on attribute_definitions (null = SYSTEM)
 *   3. Template attachment = join table (template_attribute_definitions)
 *   4. custom_field_values replaced by attribute_values (0-row; Track C aligned)
 *
 * Postgres 16: NULLS NOT DISTINCT used for uq_attr_def_scope_key.
 * phone / location types absent per AD-024 §"Explicit exclusions".
 * relationship type is enum-only; link behavior is Track D (work_entity_links).
 *
 * FK note: template_attribute_definitions references templates(id) — the active
 * table used by templates-instantiate-v51.service.ts (@Entity('templates')).
 * Re-point to template_definitions(id) when Engine 4 unification closes (AD-029).
 *
 * UNTOUCHABLES (not touched here):
 *   project_artifact_items.custom_field_values  — JSONB column, live
 *   project_artifacts.custom_field_definitions  — JSONB column + TS interface, live
 */
export class CreateAttributeEngine18000000000185 implements MigrationInterface {
  name = 'CreateAttributeEngine18000000000185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ─────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TYPE attribute_scope_enum AS ENUM ('SYSTEM', 'ORG', 'WORKSPACE')
    `);

    await queryRunner.query(`
      CREATE TYPE attribute_data_type_enum AS ENUM (
        'text', 'long_text', 'number', 'integer', 'decimal', 'currency',
        'percentage', 'date', 'datetime', 'duration', 'boolean',
        'single_select', 'multi_select', 'people', 'relationship',
        'url', 'email', 'file_reference', 'computed', 'rating'
      )
    `);

    // ── attribute_definitions ─────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE attribute_definitions (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id   UUID         NULL,
        scope             attribute_scope_enum NOT NULL,
        workspace_id      UUID         NULL,
        key               VARCHAR(80)  NOT NULL,
        label             VARCHAR(255) NOT NULL,
        data_type         attribute_data_type_enum NOT NULL,
        locked            BOOLEAN      NOT NULL DEFAULT FALSE,
        required          BOOLEAN      NOT NULL DEFAULT FALSE,
        is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
        default_value     TEXT         NULL,
        options           JSONB        NULL,
        created_by        UUID         NULL,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        CONSTRAINT chk_attr_def_scope_columns CHECK (
          (scope = 'SYSTEM'    AND organization_id IS NULL     AND workspace_id IS NULL    ) OR
          (scope = 'ORG'       AND organization_id IS NOT NULL AND workspace_id IS NULL    ) OR
          (scope = 'WORKSPACE' AND organization_id IS NOT NULL AND workspace_id IS NOT NULL)
        ),

        CONSTRAINT uq_attr_def_scope_key
          UNIQUE NULLS NOT DISTINCT (organization_id, scope, workspace_id, key)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_attr_def_org       ON attribute_definitions (organization_id) WHERE organization_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_attr_def_workspace ON attribute_definitions (workspace_id)    WHERE workspace_id    IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_attr_def_scope     ON attribute_definitions (scope)`);
    await queryRunner.query(`CREATE INDEX idx_attr_def_data_type ON attribute_definitions (data_type)`);

    // ── attribute_values ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE attribute_values (
        id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        attribute_definition_id UUID        NOT NULL REFERENCES attribute_definitions (id) ON DELETE CASCADE,
        work_task_id            UUID        NOT NULL REFERENCES work_tasks (id)            ON DELETE CASCADE,
        organization_id         UUID        NOT NULL,
        workspace_id            UUID        NOT NULL,
        value_text              TEXT        NULL,
        value_number            NUMERIC     NULL,
        value_boolean           BOOLEAN     NULL,
        value_date              DATE        NULL,
        value_datetime          TIMESTAMPTZ NULL,
        value_json              JSONB       NULL,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_attr_value_task_def UNIQUE (work_task_id, attribute_definition_id),

        CONSTRAINT chk_exactly_one_value CHECK (
          (value_text      IS NOT NULL)::int +
          (value_number    IS NOT NULL)::int +
          (value_boolean   IS NOT NULL)::int +
          (value_date      IS NOT NULL)::int +
          (value_datetime  IS NOT NULL)::int +
          (value_json      IS NOT NULL)::int = 1
        )
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_attr_val_task        ON attribute_values (work_task_id)`);
    await queryRunner.query(`CREATE INDEX idx_attr_val_definition  ON attribute_values (attribute_definition_id)`);
    await queryRunner.query(`CREATE INDEX idx_attr_val_org         ON attribute_values (organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_attr_val_workspace   ON attribute_values (workspace_id)`);
    await queryRunner.query(`CREATE INDEX idx_attr_val_number ON attribute_values (attribute_definition_id, value_number) WHERE value_number IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_attr_val_text   ON attribute_values (attribute_definition_id, value_text)   WHERE value_text   IS NOT NULL`);

    // ── template_attribute_definitions ────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE template_attribute_definitions (
        id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id             UUID    NOT NULL REFERENCES templates (id)             ON DELETE CASCADE,
        attribute_definition_id UUID    NOT NULL REFERENCES attribute_definitions (id) ON DELETE CASCADE,
        locked                  BOOLEAN NOT NULL DEFAULT FALSE,
        display_order           INT     NOT NULL DEFAULT 0,

        CONSTRAINT uq_tad_template_def UNIQUE (template_id, attribute_definition_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_tad_template   ON template_attribute_definitions (template_id)`);
    await queryRunner.query(`CREATE INDEX idx_tad_definition ON template_attribute_definitions (attribute_definition_id)`);

    // ── workspace_enabled_attributes ──────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE workspace_enabled_attributes (
        id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id            UUID        NOT NULL REFERENCES workspaces (id)            ON DELETE CASCADE,
        attribute_definition_id UUID        NOT NULL REFERENCES attribute_definitions (id) ON DELETE CASCADE,
        is_visible_by_default   BOOLEAN     NOT NULL DEFAULT TRUE,
        enabled_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_wea_workspace_def UNIQUE (workspace_id, attribute_definition_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_wea_workspace ON workspace_enabled_attributes (workspace_id)`);

    // ── Drop legacy tables (0-row verified at Step 0; values first for FK order) ─

    await queryRunner.query(`DROP TABLE IF EXISTS custom_field_values`);
    await queryRunner.query(`DROP TABLE IF EXISTS custom_fields`);
    await queryRunner.query(`DROP TABLE IF EXISTS custom_field_definitions`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workspace_enabled_attributes`);
    await queryRunner.query(`DROP TABLE IF EXISTS template_attribute_definitions`);
    await queryRunner.query(`DROP TABLE IF EXISTS attribute_values`);
    await queryRunner.query(`DROP TABLE IF EXISTS attribute_definitions`);
    await queryRunner.query(`DROP TYPE IF EXISTS attribute_data_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS attribute_scope_enum`);
    // Note: legacy tables (custom_field_values, custom_fields, custom_field_definitions)
    // are NOT recreated in down() — they were 0-row and superseded by this migration.
  }
}
