import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * v5 Prompt 4: ProjectTemplateBinding + TemplateDeltaReview for template version sync and PM review workflow.
 */
export class ProjectTemplateBindingAndTemplateDeltaReview18000000000053
  implements MigrationInterface
{
  name = 'ProjectTemplateBindingAndTemplateDeltaReview18000000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_template_bindings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        project_id uuid NOT NULL,
        template_id uuid NOT NULL,
        bound_version_id uuid NOT NULL,
        latest_available_version_id uuid NOT NULL,
        sync_status varchar(20) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_project_template_bindings_org_project
      ON project_template_bindings (organization_id, project_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_template_bindings_org
      ON project_template_bindings (organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_template_bindings_org_template
      ON project_template_bindings (organization_id, template_id)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE project_template_bindings
        ADD CONSTRAINT fk_project_template_bindings_project
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_delta_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        project_id uuid NOT NULL,
        project_template_binding_id uuid NULL,
        status varchar(24) NOT NULL,
        computed_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
        resolved_delta jsonb NULL,
        resolved_by_user_id uuid NULL,
        resolved_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_delta_reviews_org_project
      ON template_delta_reviews (organization_id, project_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_delta_reviews_status
      ON template_delta_reviews (organization_id, status)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE template_delta_reviews
        ADD CONSTRAINT fk_template_delta_reviews_project
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE template_delta_reviews
        ADD CONSTRAINT fk_template_delta_reviews_binding
        FOREIGN KEY (project_template_binding_id) REFERENCES project_template_bindings(id) ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS template_delta_reviews
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS project_template_bindings
    `);
  }
}
