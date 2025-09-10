import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTeamsAddAssignments20250906132242 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create simplified assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'contributor' CHECK (role IN ('owner', 'manager', 'contributor', 'viewer')),
        assigned_by UUID REFERENCES users(id),
        assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);`);
    await queryRunner.query(`CREATE INDEX idx_project_assignments_user ON project_assignments(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_project_assignments_org ON project_assignments(organization_id);`);

    // Migrate existing team data if exists (check if tables exist first)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
          INSERT INTO project_assignments (project_id, user_id, role, organization_id)
          SELECT DISTINCT 
            t.project_id, 
            tm.user_id, 
            'contributor',
            COALESCE(t.organization_id, '06452a38-a9ca-471d-a21a-a24c31890647')
          FROM team_members tm
          JOIN teams t ON tm.team_id = t.id
          WHERE t.project_id IS NOT NULL
          ON CONFLICT (project_id, user_id) DO NOTHING;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS project_assignments;`);
  }
}

