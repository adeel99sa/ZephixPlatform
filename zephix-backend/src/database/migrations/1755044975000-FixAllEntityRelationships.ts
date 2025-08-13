import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAllEntityRelationships1755044975000
  implements MigrationInterface
{
  name = 'FixAllEntityRelationships1755044975000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Starting comprehensive entity relationship fixes...');

    // Step 1: Fix projects table - add missing columns
    console.log('📝 Adding missing columns to projects table...');

    // Check if columns exist before adding
    const projectColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
    `);

    const existingProjectColumns = projectColumns.map(
      (col: any) => col.column_name,
    );

    if (!existingProjectColumns.includes('startDate')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "startDate" TIMESTAMP
      `);
      console.log('✅ Added startDate column to projects');
    }

    if (!existingProjectColumns.includes('endDate')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "endDate" TIMESTAMP
      `);
      console.log('✅ Added endDate column to projects');
    }

    if (!existingProjectColumns.includes('estimatedEndDate')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "estimatedEndDate" TIMESTAMP
      `);
      console.log('✅ Added estimatedEndDate column to projects');
    }

    if (!existingProjectColumns.includes('organizationId')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "organizationId" UUID
      `);
      console.log('✅ Added organizationId column to projects');
    }

    if (!existingProjectColumns.includes('projectManagerId')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "projectManagerId" UUID
      `);
      console.log('✅ Added projectManagerId column to projects');
    }

    if (!existingProjectColumns.includes('actualCost')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "actualCost" DECIMAL(15,2) DEFAULT 0
      `);
      console.log('✅ Added actualCost column to projects');
    }

    if (!existingProjectColumns.includes('riskLevel')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "riskLevel" VARCHAR(50) DEFAULT 'medium'
      `);
      console.log('✅ Added riskLevel column to projects');
    }

    if (!existingProjectColumns.includes('createdById')) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD COLUMN "createdById" UUID
      `);
      console.log('✅ Added createdById column to projects');
    }

    // Step 2: Fix teams table - add missing projectId column
    console.log('📝 Adding missing projectId column to teams table...');

    const teamColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teams'
    `);

    const existingTeamColumns = teamColumns.map((col: any) => col.column_name);

    if (!existingTeamColumns.includes('projectId')) {
      await queryRunner.query(`
        ALTER TABLE teams 
        ADD COLUMN "projectId" UUID
      `);
      console.log('✅ Added projectId column to teams');
    }

    // Step 3: Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');

    // Check if foreign keys exist
    const existingFKs = await queryRunner.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('projects', 'teams')
    `);

    // Add projects.organizationId FK
    const orgFKExists = existingFKs.find(
      (fk: any) =>
        fk.column_name === 'organizationId' &&
        fk.foreign_table_name === 'organizations',
    );

    if (!orgFKExists) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT "FK_projects_organization" 
        FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE
      `);
      console.log('✅ Added organizationId foreign key to projects');
    }

    // Add projects.createdById FK
    const createdByFKExists = existingFKs.find(
      (fk: any) =>
        fk.column_name === 'createdById' && fk.foreign_table_name === 'users',
    );

    if (!createdByFKExists) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT "FK_projects_created_by" 
        FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added createdById foreign key to projects');
    }

    // Add projects.projectManagerId FK
    const pmFKExists = existingFKs.find(
      (fk: any) =>
        fk.column_name === 'projectManagerId' &&
        fk.foreign_table_name === 'users',
    );

    if (!pmFKExists) {
      await queryRunner.query(`
        ALTER TABLE projects 
        ADD CONSTRAINT "FK_projects_project_manager" 
        FOREIGN KEY ("projectManagerId") REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added projectManagerId foreign key to projects');
    }

    // Add teams.projectId FK
    const teamProjectFKExists = existingFKs.find(
      (fk: any) =>
        fk.column_name === 'projectId' && fk.foreign_table_name === 'projects',
    );

    if (!teamProjectFKExists) {
      await queryRunner.query(`
        ALTER TABLE teams 
        ADD CONSTRAINT "FK_teams_project" 
        FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE
      `);
      console.log('✅ Added projectId foreign key to teams');
    }

    // Step 4: Add indexes for performance
    console.log('📊 Adding performance indexes...');

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_organization" ON projects("organizationId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_created_by" ON projects("createdById")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_project_manager" ON projects("projectManagerId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_teams_project" ON teams("projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_status" ON projects(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_priority" ON projects(priority)
    `);

    console.log('✅ All entity relationship fixes completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back entity relationship fixes...');

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS "FK_projects_organization"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS "FK_projects_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS "FK_projects_project_manager"
    `);

    await queryRunner.query(`
      ALTER TABLE teams DROP CONSTRAINT IF EXISTS "FK_teams_project"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_organization"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_created_by"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_project_manager"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_teams_project"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_priority"
    `);

    // Drop columns (in reverse order to avoid dependency issues)
    await queryRunner.query(`
      ALTER TABLE teams DROP COLUMN IF EXISTS "projectId"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "createdById"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "riskLevel"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "actualCost"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "projectManagerId"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "organizationId"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "estimatedEndDate"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "endDate"
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS "startDate"
    `);

    console.log('✅ Entity relationship fixes rolled back successfully!');
  }
}
