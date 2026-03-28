/**
 * System Identity Controller
 *
 * PUBLIC (no auth) endpoint that exposes environment identity
 * and live DB cluster fingerprint. Used by CI, operators, and
 * humans to verify correct environment↔DB wiring at a glance.
 *
 * NO secrets, NO tokens, NO sensitive data.
 *
 * GET /api/system/identity
 */
import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { extractDbHost } from '../../common/utils/db-safety-guard';

/** Captured once at module load — stable per process lifecycle */
const PROCESS_STARTED_AT = new Date().toISOString();

@ApiTags('System')
@Controller('system')
export class SystemIdentityController {
  private readonly logger = new Logger(SystemIdentityController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get('identity')
  @ApiOperation({
    summary: 'Public environment identity — no auth required',
    description:
      'Returns environment label, DB cluster fingerprint, and migration state. ' +
      'No secrets or sensitive data exposed. Used by CI and operators.',
  })
  @ApiResponse({ status: 200, description: 'Identity payload' })
  async getIdentity() {
    const zephixEnv = process.env.ZEPHIX_ENV || '(not set)';
    const nodeEnv = process.env.NODE_ENV || '(not set)';
    const databaseUrl = process.env.DATABASE_URL || '';
    const dbHost = extractDbHost(databaseUrl);

    // ─── LIVE DB IDENTITY (no secrets) ───────────────────────────
    const dbIdentity: Record<string, string | number | null> = {
      serverAddr: null,
      serverPort: null,
      systemIdentifier: null,
    };

    let migrationCount = 0;
    let latestMigration = '(unknown)';

    try {
      // Actual server address — proves which Postgres cluster we talk to
      const id = await this.dataSource.query(
        `SELECT inet_server_addr() as addr, inet_server_port() as port`,
      );
      if (id?.[0]) {
        dbIdentity.serverAddr = id[0].addr;
        dbIdentity.serverPort = parseInt(id[0].port, 10) || null;
      }

      // Cluster fingerprint — unique per Postgres instance
      try {
        const cluster = await this.dataSource.query(
          `SELECT system_identifier FROM pg_control_system()`,
        );
        dbIdentity.systemIdentifier =
          cluster?.[0]?.system_identifier || null;
      } catch {
        dbIdentity.systemIdentifier = '(unavailable)';
      }

      // Migration state
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
    } catch (e) {
      this.logger.error(
        `Identity query failed: ${(e as Error)?.message}`,
      );
    }

    const identity = {
      zephixEnv,
      nodeEnv,
      dbHost,
      dbIdentity,
      migrationCount,
      latestMigration,
      gitSha:
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.GIT_COMMIT_SHA ||
        '(not set)',
      startedAt: PROCESS_STARTED_AT,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `IDENTITY: env=${zephixEnv} dbHost=${dbHost} addr=${dbIdentity.serverAddr} ` +
        `sysId=${dbIdentity.systemIdentifier} migrations=${migrationCount}`,
    );

    return identity;
  }
}
