import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePhases1712345678901 implements MigrationInterface {
  name = 'EnsurePhases1712345678901';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await q.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id uuid NULL`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        organization_id uuid NULL,
        workspace_id uuid NULL,
        name text NOT NULL,
        status text NOT NULL CHECK (status IN ('not-started','in-progress','blocked','done')),
        "order" integer NOT NULL DEFAULT 0,
        start_date date NULL,
        end_date date NULL,
        owner_user_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_phases_project ON project_phases(project_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_phases_org_ws ON project_phases(organization_id, workspace_id)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_phase_project_order ON project_phases(project_id, "order")`);
  }

  public async down(): Promise<void> {
    // no-op on purpose (safety)
  }
}
