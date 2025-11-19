/**
 * Data Backfill Script for Workspace Ownership and Members
 *
 * This script:
 * 1. Sets owner_id for workspaces that don't have one (or have invalid ones)
 * 2. Ensures workspace_members records exist for all workspace owners
 * 3. Updates existing members to 'owner' role if they are the owner
 * 4. Logs results to console
 *
 * Rules:
 * - If workspace.ownerId is already set and valid → ensure workspace_members row exists
 * - If workspace.ownerId is null or invalid → find first org admin, else earliest user
 * - Always ensure workspace_members row exists for owner with role 'owner'
 * - Idempotent: safe to run multiple times
 *
 * Usage:
 *   npm run backfill:workspace-owners [--dry-run]
 *   DRY_RUN=true npm run backfill:workspace-owners
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   DRY_RUN - Set to 'true' to preview changes without applying
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WorkspaceBackfillService } from '../modules/workspaces/services/workspace-backfill.service';

async function runBackfill() {
  const dryRun =
    process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting workspace ownership and members backfill...');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied\n');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const backfillService = app.get(WorkspaceBackfillService);

  try {
    const result = await backfillService.backfillAll({ dryRun });

    // Print detailed summary
    console.log('\n' + '='.repeat(60));
    console.log('BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Workspaces scanned: ${result.workspacesScanned}`);
    console.log(`Workspaces updated: ${result.workspacesUpdated}`);
    console.log(`OwnerId changes: ${result.ownerIdChanges}`);
    console.log(`Members created: ${result.membersCreated}`);
    console.log(`Members updated: ${result.membersUpdated}`);
    console.log(`Skipped: ${result.skipped.length}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.skipped.length > 0) {
      console.log('\n⚠️  Skipped workspaces:');
      result.skipped.forEach((s) => {
        console.log(`  - ${s.workspaceId}: ${s.reason}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
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

    await app.close();
    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    await app.close();
    process.exit(1);
  }
}

runBackfill();
