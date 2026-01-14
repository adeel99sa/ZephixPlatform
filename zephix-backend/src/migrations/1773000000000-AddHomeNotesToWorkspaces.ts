import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PHASE 5.1: Add homeNotes field to workspaces
 * This field stores workspace notes/context that appears on the Workspace Home page
 */
export class AddHomeNotesToWorkspaces1773000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add homeNotes column (text, nullable)
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "home_notes" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      DROP COLUMN IF EXISTS "home_notes"
    `);
  }
}
