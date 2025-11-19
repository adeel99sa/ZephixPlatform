import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class EnsureDemoUser1762200000000 implements MigrationInterface {
  name = 'EnsureDemoUser1762200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = 'demo@zephix.ai';
    const passwordHash = await bcrypt.hash('demo123456', 10);

    // Create demo organization (check if columns exist first)
    await queryRunner.query(`
      INSERT INTO organizations (id, name, slug, status, description)
      VALUES (gen_random_uuid(), 'Zephix Demo', 'demo', 'active', 'Demo organization')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Get org id
    const orgRow: any = await queryRunner.query(
      `SELECT id FROM organizations WHERE slug='demo' LIMIT 1;`,
    );
    const orgId = orgRow?.[0]?.id;

    if (orgId) {
      // Create demo user
      await queryRunner.query(
        `
        INSERT INTO users (id, email, first_name, last_name, role, organization_id, password, is_active, is_email_verified, email_verified_at, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, 'Demo', 'User', 'admin', $2, $3, true, true, NOW(), NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET organization_id=$2, password=$3, updated_at=NOW();
      `,
        [email, orgId, passwordHash],
      );
    }
  }

  public async down(): Promise<void> {
    // Keep the demo user; no-op
  }
}
