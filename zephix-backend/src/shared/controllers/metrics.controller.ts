/**
 * Phase 3D: System Metrics Controller
 *
 * Provides operational metrics for monitoring.
 * Admin only. No secrets exposed.
 *
 * GET /metrics/system — aggregate platform stats
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
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);
  private requestCounter = { count: 0, windowStart: Date.now() };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * GET /metrics/system
   * Admin only. Returns aggregate platform stats.
   */
  @Get('system')
  async getSystemMetrics(@Req() req: AuthRequest) {
    const auth = getAuthContext(req);
    const role = auth.platformRole?.toUpperCase();
    if (role !== 'ADMIN') {
      return { code: 'AUTH_FORBIDDEN', message: 'Admin only' };
    }

    const orgId = auth.organizationId;
    const startTime = Date.now();

    try {
      // Run all metric queries in parallel for performance
      const [
        orgCount,
        userCount,
        projectCount,
        portfolioCount,
        attachmentCount,
        storageUsed,
        auditEventCount,
      ] = await Promise.all([
        this.countTable('organizations', orgId),
        this.countTable('user_organizations', orgId, 'organization_id'),
        this.countTable('projects', orgId),
        this.countTable('portfolios', orgId),
        this.countTable('attachments', orgId, 'organization_id', "status = 'uploaded'"),
        this.sumColumn('workspace_storage_usage', 'used_bytes', orgId),
        this.countTable('audit_events', orgId),
      ]);

      const elapsedMs = Date.now() - startTime;

      return {
        data: {
          organizationId: orgId,
          counts: {
            organizations: orgCount,
            activeUsers: userCount,
            projects: projectCount,
            portfolios: portfolioCount,
            attachments: attachmentCount,
            auditEvents: auditEventCount,
          },
          storage: {
            totalUsedBytes: storageUsed,
            totalUsedMB: Math.round(storageUsed / (1024 * 1024)),
          },
          system: {
            uptimeSeconds: Math.round(process.uptime()),
            memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
            heapUsedMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
            nodeVersion: process.version,
          },
          queryElapsedMs: elapsedMs,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      this.logger.error({
        context: 'METRICS_QUERY_FAILED',
        error: (err as Error).message,
      });
      return {
        data: {
          error: 'Metrics query failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async countTable(
    table: string,
    orgId: string,
    orgColumn = 'organization_id',
    extraWhere?: string,
  ): Promise<number> {
    try {
      const where = extraWhere
        ? `WHERE ${orgColumn} = $1 AND ${extraWhere}`
        : `WHERE ${orgColumn} = $1`;
      const result = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM ${table} ${where}`,
        [orgId],
      );
      return result?.[0]?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  private async sumColumn(
    table: string,
    column: string,
    orgId: string,
  ): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT COALESCE(SUM(${column}), 0)::bigint AS total FROM ${table} WHERE organization_id = $1`,
        [orgId],
      );
      return parseInt(result?.[0]?.total ?? '0', 10);
    } catch {
      return 0;
    }
  }
}
