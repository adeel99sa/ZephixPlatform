/**
 * Environment Proof Controller
 *
 * Admin-only endpoint that exposes environment wiring details
 * plus LIVE database identity queries.
 *
 * Used by CI and operators to verify correct env↔DB mapping
 * before and after deploys. Hostname alone is NOT proof —
 * we query the actual Postgres instance for its identity.
 *
 * GET /admin/system/env-proof
 */
import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../admin/guards/admin.guard';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  extractDbHost,
  validateDbWiring,
} from '../../common/utils/db-safety-guard';

/** Captured once at module load — never changes per process lifecycle */
const PROCESS_STARTED_AT = new Date().toISOString();

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/system')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EnvProofController {
  private readonly logger = new Logger(EnvProofController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get('env-proof')
  async getEnvProof() {
    const zephixEnv = process.env.ZEPHIX_ENV || '(not set)';
    const nodeEnv = process.env.NODE_ENV || '(not set)';
    const databaseUrl = process.env.DATABASE_URL || '';
    const dbHost = extractDbHost(databaseUrl);

    // Parse DB name from URL
    let dbName = '(unknown)';
    try {
      const url = new URL(databaseUrl);
      dbName = url.pathname.replace('/', '') || '(empty)';
    } catch {
      const m = databaseUrl.match(/\/([^/?]+)(\?|$)/);
      dbName = m ? m[1] : '(parse-error)';
    }

    // Run safety validation
    const safetyCheck = zephixEnv !== '(not set)' && databaseUrl
      ? validateDbWiring(zephixEnv, databaseUrl)
      : { safe: true, message: 'ZEPHIX_ENV not set — guard skipped' };

    // ─── LIVE DATABASE IDENTITY ───────────────────────────────────
    // These queries prove WHICH Postgres instance we are actually
    // connected to. Hostname alone is not proof — DNS can lie.
    let dbConnected = false;
    let dbVersion = '(unknown)';
    const dbIdentity: Record<string, string | number | null> = {
      currentDatabase: null,
      serverAddr: null,
      serverPort: null,
    };

    try {
      // DB connectivity + version
      const versionResult = await this.dataSource.query('SELECT version()');
      dbConnected = true;
      dbVersion = versionResult?.[0]?.version?.split(' ').slice(0, 2).join(' ') || '(unknown)';

      // Actual database identity from the running Postgres instance
      const identityResult = await this.dataSource.query(
        `SELECT current_database() as db,
                inet_server_addr() as addr,
                inet_server_port() as port`,
      );
      if (identityResult?.[0]) {
        dbIdentity.currentDatabase = identityResult[0].db;
        dbIdentity.serverAddr = identityResult[0].addr;
        dbIdentity.serverPort = parseInt(identityResult[0].port, 10) || null;
      }
    } catch (e) {
      dbConnected = false;
      this.logger.error(`DB identity query failed: ${(e as Error)?.message}`);
    }

    // Migration count + latest migration name
    let migrationCount = 0;
    let latestMigration = '(unknown)';
    try {
      const countResult = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM migrations',
      );
      migrationCount = parseInt(countResult?.[0]?.count || '0', 10);

      const latestResult = await this.dataSource.query(
        'SELECT name FROM migrations ORDER BY id DESC LIMIT 1',
      );
      latestMigration = latestResult?.[0]?.name || '(none)';
    } catch {
      // migrations table may not exist
    }

    // Table count — helps distinguish fresh DB vs production
    let tableCount = 0;
    try {
      const result = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      );
      tableCount = parseInt(result?.[0]?.count || '0', 10);
    } catch {
      // ignore
    }

    // Row counts in key tables for data fingerprinting
    const dataFingerprint: Record<string, number | string> = {};
    for (const table of ['users', 'organizations', 'projects']) {
      try {
        const result = await this.dataSource.query(
          `SELECT COUNT(*) as count FROM "${table}"`,
        );
        dataFingerprint[table] = parseInt(result?.[0]?.count || '0', 10);
      } catch {
        dataFingerprint[table] = '(table missing)';
      }
    }

    const proof = {
      zephixEnv,
      nodeEnv,
      dbHost,
      dbName,
      dbIdentity,
      gitSha: process.env.RAILWAY_GIT_COMMIT_SHA
        || process.env.GIT_COMMIT_SHA
        || '(not set)',
      startedAt: PROCESS_STARTED_AT,
      dbConnected,
      dbVersion,
      migrationCount,
      latestMigration,
      tableCount,
      dataFingerprint,
      safetyCheck: {
        safe: safetyCheck.safe,
        message: safetyCheck.message,
      },
      railwayServiceId: process.env.RAILWAY_SERVICE_ID || '(not set)',
      railwayEnvironmentName: process.env.RAILWAY_ENVIRONMENT_NAME || '(not set)',
      railwayEnvironmentId: process.env.RAILWAY_ENVIRONMENT_ID || '(not set)',
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `ENV_PROOF: zephixEnv=${zephixEnv} dbHost=${dbHost} dbAddr=${dbIdentity.serverAddr} ` +
      `dbName=${dbIdentity.currentDatabase} migrations=${migrationCount} safe=${safetyCheck.safe}`,
    );

    return { data: proof };
  }
}
