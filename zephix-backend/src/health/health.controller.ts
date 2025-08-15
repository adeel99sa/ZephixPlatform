import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { Logger } from '@nestjs/common';

// Define the health check interface
interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  critical: boolean;
  details: string;
  error?: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Res() res: Response) {
    const startTime = Date.now();
    const healthChecks = await this.performHealthChecks();
    const responseTime = Date.now() - startTime;

    const isHealthy = healthChecks.every(check => check.status === 'healthy');
    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      checks: healthChecks,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
      }
    };

    this.logger.log(`Health check completed in ${responseTime}ms - Status: ${response.status}`);
    
    return res.status(statusCode).json(response);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready to receive traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness(@Res() res: Response) {
    const checks = await this.performHealthChecks();
    const isReady = checks.every(check => check.status === 'healthy');
    
    return res.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: checks.filter(check => check.critical)
    });
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  private async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database connectivity check
    try {
      const isDbConnected = this.dataSource.isInitialized;
      if (isDbConnected) {
        // Test actual query execution
        await this.dataSource.query('SELECT 1');
        checks.push({
          name: 'Database Connection',
          status: 'healthy',
          critical: true,
          details: 'Database connection established and queries executing',
        });

        // Check required tables exist
        const requiredTables = ['users', 'organizations', 'projects', 'brds'];
        for (const table of requiredTables) {
          try {
            const result = await this.dataSource.query(
              "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
              [table]
            );
            const exists = result[0].exists;
            checks.push({
              name: `Table: ${table}`,
              status: exists ? 'healthy' : 'unhealthy',
              critical: table === 'users' || table === 'organizations', // Core tables are critical
              details: exists ? `Table ${table} exists` : `Table ${table} is missing`,
              error: exists ? undefined : `Table ${table} not found in public schema`,
            });
          } catch (tableError) {
            checks.push({
              name: `Table: ${table}`,
              status: 'unhealthy',
              critical: table === 'users' || table === 'organizations',
              details: `Error checking table ${table}`,
              error: tableError.message,
            });
          }
        }

        // Check foreign key constraints
        try {
          const foreignKeys = await this.dataSource.query(`
            SELECT COUNT(*) as count FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
          `);
          const fkCount = parseInt(foreignKeys[0].count);
          checks.push({
            name: 'Foreign Key Constraints',
            status: fkCount > 0 ? 'healthy' : 'unhealthy',
            critical: false,
            details: `${fkCount} foreign key constraints found`,
            error: fkCount === 0 ? 'No foreign key constraints found' : undefined,
          });
        } catch (fkError) {
          checks.push({
            name: 'Foreign Key Constraints',
            status: 'unhealthy',
            critical: false,
            details: 'Error checking foreign key constraints',
            error: fkError.message,
          });
        }

      } else {
        checks.push({
          name: 'Database Connection',
          status: 'unhealthy',
          critical: true,
          details: 'Database not initialized',
          error: 'DataSource not initialized',
        });
      }
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'unhealthy',
        critical: true,
        details: 'Database connection failed',
        error: error.message,
      });
    }

    // Redis connectivity check (if configured)
    if (process.env.REDIS_URL) {
      try {
        // Basic Redis check - you can enhance this with actual Redis client
        checks.push({
          name: 'redis',
          status: 'healthy',
          critical: false,
          details: 'Configuration present'
        });
      } catch (error) {
        checks.push({
          name: 'redis',
          status: 'unhealthy',
          critical: false,
          details: `Connection failed: ${error.message}`,
          error: error.message
        });
      }
    }

    // External service checks
    if (process.env.OPENAI_API_KEY) {
      checks.push({
        name: 'openai',
        status: 'healthy',
        critical: false,
        details: 'API key configured'
      });
    }

    if (process.env.PINECONE_API_KEY) {
      checks.push({
        name: 'pinecone',
        status: 'healthy',
        critical: false,
        details: 'API key configured'
      });
    }

    // System resource checks
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent < 90) {
      checks.push({
        name: 'memory',
        status: 'healthy',
        critical: true,
        details: `Usage: ${Math.round(memoryUsagePercent)}%`
      });
    } else {
      checks.push({
        name: 'memory',
        status: 'unhealthy',
        critical: true,
        details: `High memory usage: ${Math.round(memoryUsagePercent)}%`
      });
    }

    return checks;
  }
}
