import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProjectPhases1756400000003 implements MigrationInterface {
  name = 'CreateProjectPhases1756400000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'project_phases',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'not-started'",
          },
          {
            name: 'order',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'owner_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_phases_organization_id ON project_phases(organization_id);
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE project_phases 
      ADD CONSTRAINT fk_project_phases_project_id 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    `);

    // Add check constraint for status
    await queryRunner.query(`
      ALTER TABLE project_phases 
      ADD CONSTRAINT chk_project_phases_status 
      CHECK (status IN ('not-started', 'in-progress', 'blocked', 'done'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_phases');
  }
}
