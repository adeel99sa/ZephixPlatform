import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 1 Track A — STEP 3 copy-down table
 *
 * Mirrors template_attribute_definitions for projects (snapshot-at-instantiation
 * per AD-016 §4). instantiate-v5_1 copies template rows → project rows verbatim
 * including the locked flag, so projects carry their own materialized config
 * with no live-link back to the source template.
 *
 * tenancy columns (organization_id, workspace_id) are non-FK bare UUIDs,
 * matching work_tasks + attribute_definitions convention.
 */
export class CreateProjectAttributeDefinitions18000000000186
  implements MigrationInterface
{
  name = 'CreateProjectAttributeDefinitions18000000000186';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE project_attribute_definitions (
        id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id              UUID        NOT NULL REFERENCES projects (id)              ON DELETE CASCADE,
        attribute_definition_id UUID        NOT NULL REFERENCES attribute_definitions (id) ON DELETE CASCADE,
        locked                  BOOLEAN     NOT NULL DEFAULT FALSE,
        display_order           INT         NOT NULL DEFAULT 0,
        organization_id         UUID        NOT NULL,
        workspace_id            UUID        NOT NULL,

        CONSTRAINT uq_pad_project_def UNIQUE (project_id, attribute_definition_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_pad_project    ON project_attribute_definitions (project_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pad_definition ON project_attribute_definitions (attribute_definition_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pad_org        ON project_attribute_definitions (organization_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pad_workspace  ON project_attribute_definitions (workspace_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS project_attribute_definitions`);
  }
}
