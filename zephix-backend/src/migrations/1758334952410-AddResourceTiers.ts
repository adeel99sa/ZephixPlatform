import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResourceTiers1758334952410 implements MigrationInterface {
    name = 'AddResourceTiers1758334952410'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns to resources table
        await queryRunner.query(`
            ALTER TABLE resources 
            ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'full_member',
            ADD COLUMN IF NOT EXISTS requires_account BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20),
            ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255),
            ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP
        `);

        // Add constraint for resource_type enum
        await queryRunner.query(`
            ALTER TABLE resources 
            ADD CONSTRAINT IF NOT EXISTS check_resource_type 
            CHECK (resource_type IN ('full_member', 'guest', 'external'))
        `);

        // Add constraint for invitation_status enum
        await queryRunner.query(`
            ALTER TABLE resources 
            ADD CONSTRAINT IF NOT EXISTS check_invitation_status 
            CHECK (invitation_status IN ('pending', 'accepted', 'declined') OR invitation_status IS NULL)
        `);

        // Update existing resources to have proper resource_type
        await queryRunner.query(`
            UPDATE resources 
            SET resource_type = 'full_member', requires_account = true
            WHERE resource_type IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop constraints
        await queryRunner.query(`ALTER TABLE resources DROP CONSTRAINT IF EXISTS check_resource_type`);
        await queryRunner.query(`ALTER TABLE resources DROP CONSTRAINT IF EXISTS check_invitation_status`);
        
        // Drop columns
        await queryRunner.query(`
            ALTER TABLE resources 
            DROP COLUMN IF EXISTS resource_type,
            DROP COLUMN IF EXISTS requires_account,
            DROP COLUMN IF EXISTS invitation_status,
            DROP COLUMN IF EXISTS invited_by,
            DROP COLUMN IF EXISTS invited_at,
            DROP COLUMN IF EXISTS accepted_at
        `);
    }
}