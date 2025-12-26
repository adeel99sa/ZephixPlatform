import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAuthMvp1757826448476 implements MigrationInterface {
  name = 'FixAuthMvp1757826448476';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set all existing users to email verified for MVP
    await queryRunner.query(`
            UPDATE users 
            SET is_email_verified = true 
            WHERE is_email_verified = false
        `);

    // Ensure organizationId is not null for all users
    await queryRunner.query(`
            UPDATE users 
            SET organization_id = (
                SELECT id FROM organizations 
                WHERE organizations.id = users.organization_id 
                LIMIT 1
            )
            WHERE organization_id IS NULL
        `);

    // Create default organization if none exists (skip if status column doesn't exist yet)
    const orgTable = await queryRunner.getTable('organizations');
    if (orgTable) {
      const hasStatusColumn = orgTable.findColumnByName('status');
      if (hasStatusColumn) {
        await queryRunner.query(`
                INSERT INTO organizations (id, name, slug, settings, status, created_at, updated_at)
                SELECT 
                    gen_random_uuid(),
                    'Default Organization',
                    'default-org',
                    '{"resourceManagement":{"maxAllocationPercentage":150,"warningThreshold":80,"criticalThreshold":100,"requireJustificationAt":100,"requireApprovalAt":120}}'::jsonb,
                    'active',
                    NOW(),
                    NOW()
                WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1)
            `);
      } else {
        await queryRunner.query(`
                INSERT INTO organizations (id, name, slug, settings, created_at, updated_at)
                SELECT 
                    gen_random_uuid(),
                    'Default Organization',
                    'default-org',
                    '{"resourceManagement":{"maxAllocationPercentage":150,"warningThreshold":80,"criticalThreshold":100,"requireJustificationAt":100,"requireApprovalAt":120}}'::jsonb,
                    NOW(),
                    NOW()
                WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1)
            `);
      }
    }

    // Assign users without organization to default organization
    await queryRunner.query(`
            UPDATE users 
            SET organization_id = (
                SELECT id FROM organizations 
                WHERE slug = 'default-org' 
                LIMIT 1
            )
            WHERE organization_id IS NULL
        `);

    // Create user_organizations entries for users without them
    await queryRunner.query(`
            INSERT INTO user_organizations (id, "userId", "organizationId", role, "isActive", permissions, "joinedAt", "createdAt", "updatedAt")
            SELECT 
                gen_random_uuid(),
                u.id,
                u.organization_id,
                'admin',
                true,
                '{}'::jsonb,
                u.created_at::date,
                u.created_at,
                u.updated_at
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM user_organizations uo 
                WHERE uo."userId" = u.id
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert email verification status
    await queryRunner.query(`
            UPDATE users 
            SET is_email_verified = false 
            WHERE is_email_verified = true
        `);
  }
}
