import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkspaceHierarchy1759515527522 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add parent_workspace_id for hierarchy
        await queryRunner.query(`
            ALTER TABLE workspaces 
            ADD COLUMN parent_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
        `);

        // Add workspace_type to distinguish levels
        await queryRunner.query(`
            ALTER TABLE workspaces 
            ADD COLUMN workspace_type VARCHAR(50) DEFAULT 'standard';
        `);

        // Add level indicator (0 = root, 1 = child, 2 = grandchild, etc)
        await queryRunner.query(`
            ALTER TABLE workspaces 
            ADD COLUMN hierarchy_level INT DEFAULT 0;
        `);

        // Add index for parent lookups
        await queryRunner.query(`
            CREATE INDEX idx_workspaces_parent ON workspaces(parent_workspace_id);
        `);

        // Add index for hierarchy queries
        await queryRunner.query(`
            CREATE INDEX idx_workspaces_hierarchy ON workspaces(organization_id, hierarchy_level);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX idx_workspaces_hierarchy;`);
        await queryRunner.query(`DROP INDEX idx_workspaces_parent;`);
        await queryRunner.query(`ALTER TABLE workspaces DROP COLUMN hierarchy_level;`);
        await queryRunner.query(`ALTER TABLE workspaces DROP COLUMN workspace_type;`);
        await queryRunner.query(`ALTER TABLE workspaces DROP COLUMN parent_workspace_id;`);
    }

}
