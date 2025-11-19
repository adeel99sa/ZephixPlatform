import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditAndIndexes1757227595841 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        action VARCHAR(50) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        request_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);

    // 2. Create indexes for audit_logs
    await queryRunner.query(`
      CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at DESC);
      CREATE INDEX idx_audit_org_entity ON audit_logs(organization_id, entity_type);
      CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
    `);

    // 3. Add missing indexes to resources table (skip is_active for now)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_org 
      ON resources(organization_id);
    `);

    // 4. Add indexes to resource_allocations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_allocations_resource_date 
      ON resource_allocations(resource_id, start_date, end_date);
      
      CREATE INDEX IF NOT EXISTS idx_allocations_org 
      ON resource_allocations(organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_resources_org`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_allocations_resource_date`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_allocations_org`);
  }
}
