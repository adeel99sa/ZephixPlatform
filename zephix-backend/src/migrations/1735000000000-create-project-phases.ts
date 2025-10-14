import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectPhases1735000000000 implements MigrationInterface {
  name = 'CreateProjectPhases1735000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        organization_id uuid NOT NULL,
        workspace_id uuid,
        name varchar(160) NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'not-started',
        "order" int NOT NULL,
        start_date date NULL,
        end_date date NULL,
        owner_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_project_phases_project_order ON project_phases(project_id, "order");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id);`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS project_phases;`);
  }
}
