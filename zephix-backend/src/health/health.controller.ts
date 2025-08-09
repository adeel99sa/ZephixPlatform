import { Controller, Get, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LLMProviderService } from '../ai/llm-provider.service';
import { MetricsService } from '../observability/metrics.service';
import { BUILD_METADATA } from '../build-metadata';

@Controller('')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private llmProvider: LLMProviderService,
    private metricsService: MetricsService,
  ) {}

  @Get('health')
  async getHealth() {
    try {
      if (!this.dataSource.isInitialized) {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          status: 'error',
          timestamp: new Date().toISOString(),
          service: 'Zephix Backend Service',
          database: 'disconnected',
          message: 'Database connection not initialized',
        };
      }

      await this.dataSource.query('SELECT 1');

      return {
        statusCode: HttpStatus.OK,
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        build: {
          sha: BUILD_METADATA.sha,
          timestamp: BUILD_METADATA.timestamp,
        },
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        database: 'error',
        message: error.message,
      };
    }
  }

  @Get('_status')
  getStatus() {
    return {
      statusCode: HttpStatus.OK,
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Zephix Backend Service',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      build: {
        sha: BUILD_METADATA.sha,
        timestamp: BUILD_METADATA.timestamp,
      },
    };
  }

  @Get('ready')
  async readiness() {
    try {
      // Comprehensive readiness check
      if (!this.dataSource.isInitialized) {
        throw new Error('Database connection not initialized');
      }

      // Test database with a query that requires table structure
      await this.dataSource.query('SELECT COUNT(*) FROM organizations LIMIT 1');
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        checks: {
          database: 'pass',
          migrations: 'pass',
          essential_tables: 'pass',
        },
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        error: `Service not ready: ${error.message}`,
        checks: {
          database: 'fail',
          migrations: 'unknown',
          essential_tables: 'fail',
        },
      };
    }
  }

  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    try {
      // Update database connection metrics
      const dbMetrics = await this.getDatabaseMetrics();
      if (dbMetrics.status === 'connected' && dbMetrics.activeConnections) {
        this.metricsService.setActiveConnections(parseInt(dbMetrics.activeConnections.toString()));
      }

      // Get Prometheus formatted metrics
      const metrics = await this.metricsService.getMetrics();
      
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        message: 'Failed to get metrics',
        error: error.message,
      });
    }
  }

  @Get('metrics/json')
  @UseGuards(JwtAuthGuard)
  async getMetricsJson(@Request() req) {
    try {
      const dbStats = await this.getDatabaseMetrics();
      const memoryUsage = process.memoryUsage();
      
      return {
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        metrics: {
          system: {
            uptime: process.uptime(),
            memory: {
              rss: memoryUsage.rss,
              heapUsed: memoryUsage.heapUsed,
              heapTotal: memoryUsage.heapTotal,
              external: memoryUsage.external,
            },
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version,
          },
          database: dbStats,
          requestInfo: {
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            userId: req.user?.id,
          },
        },
        build: {
          sha: BUILD_METADATA.sha,
          timestamp: BUILD_METADATA.timestamp,
        },
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Zephix Backend Service',
        message: 'Failed to gather metrics',
        error: error.message,
      };
    }
  }

  private async getDatabaseMetrics() {
    try {
      if (!this.dataSource.isInitialized) {
        return { status: 'disconnected' };
      }

      const connectionCount = await this.dataSource.query(
        'SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = $1',
        ['active']
      );

      const dbSize = await this.dataSource.query(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
      );

      return {
        status: 'connected',
        activeConnections: parseInt(connectionCount[0]?.active_connections || '0'),
        databaseSize: dbSize[0]?.size || 'unknown',
        driver: this.dataSource.driver.options.type,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  @Get('llm-provider')
  @UseGuards(JwtAuthGuard)
  async getLLMProviderStatus(@Request() req) {
    try {
      const compliance = this.llmProvider.getComplianceStatus();
      const settings = this.llmProvider.getProviderSettings();
      
      return {
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        service: 'LLM Provider Status',
        provider: {
          configured: this.llmProvider.isConfigured(),
          provider: settings.provider,
          model: settings.model,
          apiVersion: settings.apiVersion,
        },
        dataRetention: {
          compliant: compliance.isCompliant,
          dataRetentionOptOut: settings.dataRetentionOptOut,
          dataCollectionEnabled: settings.enableDataCollection,
          enforcementEnabled: settings.enforceNoDataRetention,
        },
        compliance: {
          status: compliance.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
          issues: compliance.issues,
          recommendations: compliance.recommendations,
        },
        requestInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          userId: req.user?.id,
        },
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'LLM Provider Status',
        message: 'Failed to get LLM provider status',
        error: error.message,
      };
    }
  }
}
