import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanAuthTables1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Remove test data
    await queryRunner.query(`DELETE FROM users WHERE id LIKE '00000000%'`);
    
    // Add missing columns
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false
    `);
    
    // Create audit log table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        event_type VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create refresh tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        revoked_at TIMESTAMP,
        replaced_by UUID REFERENCES refresh_tokens(id),
        ip_address INET,
        user_agent TEXT
      )
    `);
    
    // Add indexes
    await queryRunner.query(`
      CREATE INDEX idx_users_email_verification ON users(email_verification_token);
      CREATE INDEX idx_users_password_reset ON users(password_reset_token);
      CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token_hash);
      CREATE INDEX idx_auth_audit_user ON auth_audit_log(user_id);
    `);
  }
  
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auth_audit_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
  }
}
