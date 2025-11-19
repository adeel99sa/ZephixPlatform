/**
 * Data Backfill Script for Workspace Ownership
 *
 * This script:
 * 1. Sets owner_id for workspaces that don't have one
 * 2. Creates workspace_members records for owners
 * 3. Logs results to console and optionally to audit table
 *
 * Usage:
 *   npm run backfill:workspace-ownership [--dry-run]
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 *   DRY_RUN - Set to 'true' to preview changes without applying
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

interface BackfillResult {
  workspacesProcessed: number;
  ownersAssigned: number;
  membersCreated: number;
  errors: Array<{ workspaceId: string; error: string }>;
  skipped: Array<{ workspaceId: string; reason: string }>;
}

async function backfillWorkspaceOwnership(
  dryRun: boolean = false,
): Promise<BackfillResult> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Workspace, WorkspaceMember, User, UserOrganization],
    synchronize: false,
    logging: false,
  });

  const result: BackfillResult = {
    workspacesProcessed: 0,
    ownersAssigned: 0,
    membersCreated: 0,
    errors: [],
    skipped: [],
  };

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be applied\n');
    }

    // Find all workspaces without owner_id
    const workspacesWithoutOwner = await queryRunner.query(`
      SELECT w.id, w.organization_id, w.created_by, w.name
      FROM workspaces w
      WHERE w.owner_id IS NULL
      AND w.deleted_at IS NULL
      ORDER BY w.created_at ASC
    `);

    console.log(
      `Found ${workspacesWithoutOwner.length} workspaces without owner_id\n`,
    );

    for (const ws of workspacesWithoutOwner) {
      result.workspacesProcessed++;

      try {
        // Strategy: Find earliest admin in org, else any org admin, else created_by user
        const ownerCandidate = await queryRunner.query(
          `
          SELECT uo.user_id, uo.role, uo.joined_at
          FROM user_organizations uo
          WHERE uo.organization_id = $1
          AND uo.is_active = true
          AND uo.role IN ('admin', 'owner')
          ORDER BY
            CASE WHEN uo.role = 'owner' THEN 1 ELSE 2 END,
            uo.joined_at ASC
          LIMIT 1
        `,
          [ws.organization_id],
        );

        let ownerId: string | null = null;

        if (ownerCandidate.length > 0) {
          ownerId = ownerCandidate[0].user_id;
        } else {
          // Fallback to created_by if they exist in the org
          const creatorInOrg = await queryRunner.query(
            `
            SELECT user_id
            FROM user_organizations
            WHERE organization_id = $1
            AND user_id = $2
            AND is_active = true
            LIMIT 1
          `,
            [ws.organization_id, ws.created_by],
          );

          if (creatorInOrg.length > 0) {
            ownerId = ws.created_by;
          } else {
            // Last resort: any active user in org
            const anyUser = await queryRunner.query(
              `
              SELECT user_id
              FROM user_organizations
              WHERE organization_id = $1
              AND is_active = true
              ORDER BY joined_at ASC
              LIMIT 1
            `,
              [ws.organization_id],
            );

            if (anyUser.length > 0) {
              ownerId = anyUser[0].user_id;
            }
          }
        }

        if (!ownerId) {
          result.skipped.push({
            workspaceId: ws.id,
            reason: 'No eligible users found in organization',
          });
          console.log(`⚠️  Skipped ${ws.name} (${ws.id}): No eligible users`);
          continue;
        }

        if (dryRun) {
          console.log(
            `[DRY RUN] Would set owner_id=${ownerId} for workspace ${ws.name} (${ws.id})`,
          );
          result.ownersAssigned++;
        } else {
          // Set owner_id
          await queryRunner.query(
            `
            UPDATE workspaces
            SET owner_id = $1
            WHERE id = $2
          `,
            [ownerId, ws.id],
          );

          console.log(
            `✅ Set owner_id=${ownerId} for workspace ${ws.name} (${ws.id})`,
          );
          result.ownersAssigned++;

          // Check if workspace_member record exists
          const existingMember = await queryRunner.query(
            `
            SELECT id FROM workspace_members
            WHERE workspace_id = $1 AND user_id = $2
          `,
            [ws.id, ownerId],
          );

          if (existingMember.length === 0) {
            // Create workspace_member record with owner role
            await queryRunner.query(
              `
              INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
              VALUES (gen_random_uuid(), $1, $2, 'owner', NOW(), NOW())
            `,
              [ws.id, ownerId],
            );

            console.log(`  ✅ Created workspace_member record (owner role)`);
            result.membersCreated++;
          } else {
            // Update existing member to owner role
            await queryRunner.query(
              `
              UPDATE workspace_members
              SET role = 'owner', updated_at = NOW()
              WHERE workspace_id = $1 AND user_id = $2
            `,
              [ws.id, ownerId],
            );

            console.log(`  ✅ Updated existing member to owner role`);
          }
        }
      } catch (error: any) {
        result.errors.push({
          workspaceId: ws.id,
          error: error.message || String(error),
        });
        console.error(`❌ Error processing workspace ${ws.id}:`, error.message);
      }
    }

    await queryRunner.release();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Workspaces processed: ${result.workspacesProcessed}`);
    console.log(`Owners assigned: ${result.ownersAssigned}`);
    console.log(`Members created: ${result.membersCreated}`);
    console.log(`Skipped: ${result.skipped.length}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.skipped.length > 0) {
      console.log('\nSkipped workspaces:');
      result.skipped.forEach((s) => {
        console.log(`  - ${s.workspaceId}: ${s.reason}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((e) => {
        console.log(`  - ${e.workspaceId}: ${e.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were applied.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Backfill completed successfully');
    }

    return result;
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Main execution
const dryRun =
  process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

backfillWorkspaceOwnership(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
