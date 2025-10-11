import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceThresholds1735562400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add threshold fields to resources table
    await queryRunner.query(`
      ALTER TABLE resources 
      ADD COLUMN warning_threshold INTEGER DEFAULT 80,
      ADD COLUMN critical_threshold INTEGER DEFAULT 100,
      ADD COLUMN max_threshold INTEGER DEFAULT 120
    `);
    
    // Create resource_conflicts table
    await queryRunner.query(`
      CREATE TABLE resource_conflicts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        resource_id UUID REFERENCES resources(id),
        project_id UUID REFERENCES projects(id),
        week_start DATE NOT NULL,
        allocation_percentage INTEGER NOT NULL,
        conflict_type VARCHAR(20) NOT NULL,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        organization_id UUID REFERENCES organizations(id)
      )
    `);
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE resource_conflicts`);
    await queryRunner.query(`
      ALTER TABLE resources 
      DROP COLUMN warning_threshold,
      DROP COLUMN critical_threshold,
      DROP COLUMN max_threshold
    `);
  }
}









