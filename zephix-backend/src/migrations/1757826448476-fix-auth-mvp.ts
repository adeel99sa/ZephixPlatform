import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAuthMvp1757826448476 implements MigrationInterface {
    name = 'FixAuthMvp1757826448476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Set all existing users to email verified for MVP
        await queryRunner.query(`
            UPDATE users 
            SET "isEmailVerified" = true 
            WHERE "isEmailVerified" = false
        `);

        // Ensure organizationId is not null for all users
        await queryRunner.query(`
            UPDATE users 
            SET "organizationId" = (
                SELECT id FROM organizations 
                WHERE organizations.id = users."organizationId" 
                LIMIT 1
            )
            WHERE "organizationId" IS NULL
        `);

        // Create default organization if none exists
        await queryRunner.query(`
            INSERT INTO organizations (id, name, slug, settings, status, "createdAt", "updatedAt")
            SELECT 
                gen_random_uuid(),
                'Default Organization',
                'default-org',
                '{"resourceManagement":{"maxAllocationPercentage":150,"warningThreshold":80,"criticalThreshold":100,"requireJustificationAt":100,"requireApprovalAt":120}}'::jsonb,
                'active'::organizations_status_enum,
                NOW(),
                NOW()
            WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1)
        `);

        // Assign users without organization to default organization
        await queryRunner.query(`
            UPDATE users 
            SET "organizationId" = (
                SELECT id FROM organizations 
                WHERE slug = 'default-org' 
                LIMIT 1
            )
            WHERE "organizationId" IS NULL
        `);

        // Create user_organizations entries for users without them
        await queryRunner.query(`
            INSERT INTO user_organizations (id, "userId", "organizationId", role, "isActive", permissions, "joinedAt", "createdAt", "updatedAt")
            SELECT 
                gen_random_uuid(),
                u.id,
                u."organizationId",
                'admin'::user_organizations_role_enum,
                true,
                '{}'::jsonb,
                u."createdAt"::date,
                u."createdAt",
                u."updatedAt"
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
            SET "isEmailVerified" = false 
            WHERE "isEmailVerified" = true
        `);
    }
}
