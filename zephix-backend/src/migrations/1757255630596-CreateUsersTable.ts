import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1757255630596 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
    `);

    // Insert test user if doesn't exist
    await queryRunner.query(`
      INSERT INTO users (id, email, password, first_name, last_name, organization_id)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'test@zephix.com',
        '$2b$10$YourHashedPasswordHere',
        'Test',
        'User',
        (SELECT id FROM organizations LIMIT 1)
      )
      ON CONFLICT (email) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
  }
}