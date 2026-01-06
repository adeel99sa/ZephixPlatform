import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3: Add permissions_config and default_methodology to workspaces
 * This migration adds the permissions matrix storage and default methodology
 */
export class AddPermissionsConfigToWorkspaces1765000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add permissions_config column (jsonb)
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "permissions_config" jsonb NULL
    `);

    // Add default_methodology column
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "default_methodology" varchar(50) NULL
    `);

    // Set default permissions config for existing workspaces
    // Default: owner has all, admin has most, member can view and create docs, viewer can only view
    const defaultConfig = {
      view_workspace: ['owner', 'admin', 'member', 'viewer'],
      edit_workspace_settings: ['owner', 'admin'],
      manage_workspace_members: ['owner', 'admin'],
      change_workspace_owner: ['owner'],
      archive_workspace: ['owner', 'admin'],
      delete_workspace: ['owner'],
      create_project_in_workspace: ['owner', 'admin', 'member'],
      create_board_in_workspace: ['owner', 'admin', 'member'],
      create_document_in_workspace: ['owner', 'admin', 'member', 'viewer'],
    };

    await queryRunner.query(
      `
      UPDATE "workspaces"
      SET "permissions_config" = $1::jsonb
      WHERE "permissions_config" IS NULL
    `,
      [JSON.stringify(defaultConfig)],
    );

    // Set default methodology to 'waterfall' for existing workspaces
    await queryRunner.query(`
      UPDATE "workspaces"
      SET "default_methodology" = 'waterfall'
      WHERE "default_methodology" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "default_methodology"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "permissions_config"
    `);
  }
}

