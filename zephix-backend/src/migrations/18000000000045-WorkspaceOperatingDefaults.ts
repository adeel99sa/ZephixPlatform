import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkspaceOperatingDefaults18000000000045 implements MigrationInterface {
  name = 'WorkspaceOperatingDefaults18000000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "business_unit_label" varchar(120)
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "default_template_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "inherit_org_default_template" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "governance_inheritance_mode" varchar(32) NOT NULL DEFAULT 'ORG_DEFAULT'
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "allowed_template_ids" uuid[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "allowed_template_ids"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "governance_inheritance_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "inherit_org_default_template"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "default_template_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "business_unit_label"
    `);
  }
}
