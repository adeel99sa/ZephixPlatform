import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 (Template Center): Add team_member_ids JSONB column on projects.
 *
 * Stores the explicit per-project team — a subset of workspace members that
 * are opted into this project. Activities assignee pool is filtered to this set.
 * Project Manager (project_manager_id) is always implicitly part of the team.
 *
 * Default empty array for new and existing rows.
 */
export class AddProjectTeamMemberIds18000000000063
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS team_member_ids jsonb DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN IF EXISTS team_member_ids;
    `);
  }
}
