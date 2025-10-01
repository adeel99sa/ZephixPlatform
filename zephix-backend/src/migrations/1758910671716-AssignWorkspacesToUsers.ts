import { MigrationInterface, QueryRunner } from "typeorm";

export class AssignWorkspacesToUsers1758910671716 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Get all users without workspaces
        const usersWithoutWorkspace = await queryRunner.query(`
            SELECT u.id, u.email, u.organization_id 
            FROM users u 
            WHERE u.current_workspace_id IS NULL
        `);

        console.log(`Found ${usersWithoutWorkspace.length} users without workspaces`);

        for (const user of usersWithoutWorkspace) {
            // Step 2: Check if organization has a workspace
            const existingWorkspace = await queryRunner.query(`
                SELECT id FROM workspaces 
                WHERE organization_id = $1 
                LIMIT 1
            `, [user.organization_id]);

            let workspaceId;
            
            if (existingWorkspace.length > 0) {
                workspaceId = existingWorkspace[0].id;
                console.log(`Using existing workspace ${workspaceId} for user ${user.email}`);
            } else {
                // Step 3: Create new workspace
                const newWorkspace = await queryRunner.query(`
                    INSERT INTO workspaces (id, name, organization_id, owner_id, is_active, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
                    RETURNING id
                `, [`Default Workspace`, user.organization_id, user.id]);
                
                workspaceId = newWorkspace[0].id;
                console.log(`Created new workspace ${workspaceId} for user ${user.email}`);
            }

            // Step 4: Update user with workspace
            await queryRunner.query(`
                UPDATE users 
                SET current_workspace_id = $1, updated_at = NOW()
                WHERE id = $2
            `, [workspaceId, user.id]);

            // Step 5: Create user_workspace relationship
            await queryRunner.query(`
                INSERT INTO user_workspaces (id, user_id, workspace_id, role, is_active, joined_at, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
                ON CONFLICT (user_id, workspace_id) DO NOTHING
            `, [user.id, workspaceId]);

            console.log(`Assigned workspace ${workspaceId} to user ${user.email}`);
        }

        // Step 6: Assign workspaces to orphaned projects
        const orphanedProjects = await queryRunner.query(`
            UPDATE projects p
            SET workspace_id = (
                SELECT w.id 
                FROM workspaces w 
                WHERE w.organization_id = p.organization_id 
                LIMIT 1
            )
            WHERE p.workspace_id IS NULL
            RETURNING p.id, p.name
        `);

        console.log(`Assigned workspaces to ${orphanedProjects.length} orphaned projects`);

        // Step 7: Add joinedAt column to user_workspaces if it doesn't exist
        const hasJoinedAtColumn = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_workspaces' 
            AND column_name = 'joined_at'
        `);

        if (hasJoinedAtColumn.length === 0) {
            await queryRunner.query(`
                ALTER TABLE user_workspaces 
                ADD COLUMN joined_at TIMESTAMP
            `);
            console.log('Added joined_at column to user_workspaces table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // This migration should not be reversed as it fixes critical data
        throw new Error('This migration cannot be reversed - it fixes critical workspace assignments');
    }

}
