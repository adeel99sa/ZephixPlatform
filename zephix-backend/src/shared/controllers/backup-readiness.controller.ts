/**
 * Phase 3D: Backup Readiness Controller
 *
 * Admin-only endpoint that confirms system is configured for
 * backup and disaster recovery.
 *
 * GET /admin/system/backup-readiness
 */
import {
  Controller,
  Get,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../admin/guards/admin.guard';
import { AuthRequest } from '../../common/http/auth-request';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/system')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BackupReadinessController {
  private readonly logger = new Logger(BackupReadinessController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get('backup-readiness')
  async getBackupReadiness(@Req() _req: AuthRequest) {
    const checks: Record<string, any> = {};

    // 1. Last migration ID
    try {
      const migrations = await this.dataSource.query(
        `SELECT name FROM migrations ORDER BY id DESC LIMIT 1`,
      );
      checks.lastMigration = migrations?.[0]?.name || 'none';
      checks.migrationOk = !!migrations?.[0]?.name;
    } catch {
      // migrations table might not exist yet or different name
      try {
        const result = await this.dataSource.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
        );
        checks.lastMigration = 'query_failed';
        checks.migrationOk = false;
        checks.tableCount = result?.length || 0;
      } catch {
        checks.lastMigration = 'unavailable';
        checks.migrationOk = false;
      }
    }

    // 2. Storage provider configured
    checks.storageProvider = process.env.STORAGE_PROVIDER || 's3';
    checks.storageBucket = process.env.STORAGE_BUCKET ? 'configured' : 'not_configured';
    checks.storageConfigured = !!(process.env.STORAGE_BUCKET);

    // 3. Audit module registered (check if audit_events table exists)
    try {
      await this.dataSource.query(`SELECT 1 FROM audit_events LIMIT 0`);
      checks.auditModuleActive = true;
    } catch {
      checks.auditModuleActive = false;
    }

    // 4. Plan status guard active (check if organizations table has plan_code)
    try {
      await this.dataSource.query(
        `SELECT plan_code FROM organizations LIMIT 0`,
      );
      checks.planStatusGuardReady = true;
    } catch {
      checks.planStatusGuardReady = false;
    }

    // 5. Database connection
    try {
      await this.dataSource.query('SELECT 1');
      checks.databaseConnected = true;
    } catch {
      checks.databaseConnected = false;
    }

    // 6. Core tables exist
    const coreTables = [
      'organizations', 'workspaces', 'projects', 'work_tasks',
      'portfolios', 'attachments', 'audit_events', 'workspace_storage_usage',
    ];
    const existingTables: string[] = [];
    for (const table of coreTables) {
      try {
        await this.dataSource.query(`SELECT 1 FROM ${table} LIMIT 0`);
        existingTables.push(table);
      } catch {
        // table doesn't exist
      }
    }
    checks.coreTablesPresent = existingTables.length;
    checks.coreTablesTotal = coreTables.length;
    checks.missingCoreTables = coreTables.filter(t => !existingTables.includes(t));

    const allOk =
      checks.databaseConnected &&
      checks.auditModuleActive &&
      checks.planStatusGuardReady &&
      checks.missingCoreTables.length === 0;

    return {
      data: {
        ready: allOk,
        checks,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
