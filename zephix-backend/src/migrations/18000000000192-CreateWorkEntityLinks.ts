import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 192 — work_entity_links (Wave 1 Track D)
 *
 * Polymorphic cross-entity relationship graph. No DB FKs on source/target
 * endpoints (documented weakness) — EntityRelationService is the sole writer
 * and validates both endpoints exist, are live, and share workspace_id.
 *
 * ARTIFACT enum value resolves to project_artifact_items (not the project_artifacts
 * envelope). See entity-relation.service.ts GC_ENDPOINT_TABLES mirror-comment.
 *
 * Existing flat governance columns (waterfall_enabled, baselines_enabled,
 * earned_value_enabled, capacity_enabled) on projects are separate concerns
 * and are NOT superseded by this table.
 *
 * chk_no_task_task: task↔task links are rejected at the service layer (409
 * USE_DEPENDENCIES — task-to-task lives in work_task_dependencies) and also
 * enforced here as defense-in-depth.
 */
export class CreateWorkEntityLinks18000000000192 implements MigrationInterface {
  name = 'CreateWorkEntityLinks18000000000192';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE work_entity_type_enum AS ENUM ('TASK', 'RISK', 'ARTIFACT')`,
    );
    await queryRunner.query(
      `CREATE TYPE work_relation_type_enum AS ENUM ('RELATES_TO', 'MITIGATES')`,
    );
    await queryRunner.query(`
      CREATE TABLE work_entity_links (
        id                 UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id    UUID                     NOT NULL,
        workspace_id       UUID                     NOT NULL,
        source_entity_type work_entity_type_enum    NOT NULL,
        source_entity_id   UUID                     NOT NULL,
        target_entity_type work_entity_type_enum    NOT NULL,
        target_entity_id   UUID                     NOT NULL,
        relation_type      work_relation_type_enum  NOT NULL,
        created_by         UUID                     NOT NULL,
        created_at         TIMESTAMPTZ              NOT NULL DEFAULT now(),

        CONSTRAINT chk_no_task_task CHECK (
          NOT (source_entity_type = 'TASK' AND target_entity_type = 'TASK')
        ),
        CONSTRAINT uq_wel_endpoints UNIQUE (
          source_entity_type, source_entity_id,
          target_entity_type, target_entity_id,
          relation_type
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_wel_source    ON work_entity_links (source_entity_type, source_entity_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_wel_target    ON work_entity_links (target_entity_type, target_entity_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_wel_workspace ON work_entity_links (workspace_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS work_entity_links`);
    await queryRunner.query(`DROP TYPE IF EXISTS work_relation_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS work_entity_type_enum`);
  }
}
