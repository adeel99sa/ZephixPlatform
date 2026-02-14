/**
 * Environment Proof Controller
 *
 * Admin-only endpoint that exposes environment wiring details.
 * Used by CI and operators to verify correct env↔DB mapping
 * before and after deploys.
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

    // DB connectivity check
    let dbConnected = false;
    let dbVersion = '(unknown)';
    try {
      const result = await this.dataSource.query('SELECT version()');
      dbConnected = true;
      dbVersion = result?.[0]?.version?.split(' ').slice(0, 2).join(' ') || '(unknown)';
    } catch {
      dbConnected = false;
    }

    // Migration count
    let migrationCount = 0;
    try {
      const result = await this.dataSource.query('SELECT COUNT(*) as count FROM migrations');
      migrationCount = parseInt(result?.[0]?.count || '0', 10);
    } catch {
      // migrations table may not exist
    }

    const proof = {
      zephixEnv,
      nodeEnv,
      dbHost,
      dbName,
      dbConnected,
      dbVersion,
      migrationCount,
      safetyCheck: {
        safe: safetyCheck.safe,
        message: safetyCheck.message,
      },
      railwayServiceId: process.env.RAILWAY_SERVICE_ID || '(not set)',
      railwayEnvironment: process.env.RAILWAY_ENVIRONMENT || '(not set)',
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`ENV_PROOF requested: zephixEnv=${zephixEnv} dbHost=${dbHost} safe=${safetyCheck.safe}`);

    return { data: proof };
  }
}
