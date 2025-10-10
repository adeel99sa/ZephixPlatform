import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationWorkspaceConfig1759515536696 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE organization_workspace_config (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                max_depth INT DEFAULT 2,
                level_0_label VARCHAR(50) DEFAULT 'Workspace',
                level_1_label VARCHAR(50) DEFAULT 'Sub-workspace',
                level_2_label VARCHAR(50) DEFAULT 'Project',
                allow_projects_at_all_levels BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(organization_id)
            );
        `);

        // Create default config for existing organizations
        await queryRunner.query(`
            INSERT INTO organization_workspace_config (organization_id)
            SELECT id FROM organizations;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE organization_workspace_config;`);
    }

}
