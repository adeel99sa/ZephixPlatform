import { Router, Request, Response } from 'express';
import { Logger } from '../../infrastructure/logging/logger';
import { HealthCheck, ReadinessCheck, MetricsInfo } from '../../shared/types';
import { env } from '../../shared/types';

const logger = new Logger('HealthRoutes');

/**
 * Health check routes for monitoring and observability
 */
export const healthRoutes = require('express').Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Application health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *       503:
 *         description: Application is unhealthy
 */
healthRoutes.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const healthChecks: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: env.NODE_ENV,
      version: env.npm_package_version,
      checks: {
        database: 'unknown',
        redis: 'unknown'
      }
    };

    // Database health check
    try {
      const dataSource = (req.app as any).dataSource;
      if (dataSource && dataSource.isInitialized) {
        await dataSource.query('SELECT 1');
        healthChecks.checks.database = 'healthy';
      } else {
        healthChecks.checks.database = 'unhealthy';
      }
    } catch (error) {
      healthChecks.checks.database = 'unhealthy';
      logger.error('Database health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Redis health check
    try {
      const redis = (req.app as any).redis;
      if (redis) {
        await redis.ping();
        healthChecks.checks.redis = 'healthy';
      } else {
        healthChecks.checks.redis = 'unhealthy';
      }
    } catch (error) {
      healthChecks.checks.redis = 'unhealthy';
      logger.error('Redis health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;
    healthChecks.responseTime = responseTime;

    // Determine overall health
    const allHealthy = Object.values(healthChecks.checks).every(check => check === 'healthy');
    healthChecks.status = allHealthy ? 'healthy' : 'unhealthy';

    if (allHealthy) {
      res.status(200).json(healthChecks);
    } else {
      res.status(503).json(healthChecks);
    }

    logger.info('Health check completed', {
      status: healthChecks.status,
      responseTime,
      checks: healthChecks.checks
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Application readiness check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
healthRoutes.get('/ready', async (req: Request, res: Response) => {
  try {
    const readinessChecks: ReadinessCheck = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        redis: 'unknown'
      }
    };

    // Database readiness check
    try {
      const dataSource = (req.app as any).dataSource;
      if (dataSource && dataSource.isInitialized) {
        await dataSource.query('SELECT 1');
        readinessChecks.checks.database = 'ready';
      } else {
        readinessChecks.checks.database = 'not_ready';
      }
    } catch (error) {
      readinessChecks.checks.database = 'not_ready';
      logger.error('Database readiness check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Redis readiness check
    try {
      const redis = (req.app as any).redis;
      if (redis) {
        await redis.ping();
        readinessChecks.checks.redis = 'ready';
      } else {
        readinessChecks.checks.redis = 'not_ready';
      }
    } catch (error) {
      readinessChecks.checks.redis = 'not_ready';
      logger.error('Redis readiness check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Determine overall readiness
    const allReady = Object.values(readinessChecks.checks).every(check => check === 'ready');

    if (allReady) {
      readinessChecks.status = 'ready';
      res.status(200).json(readinessChecks);
    } else {
      readinessChecks.status = 'not_ready';
      res.status(503).json(readinessChecks);
    }

    logger.info('Readiness check completed', {
      status: readinessChecks.status,
      checks: readinessChecks.checks
    });

  } catch (error) {
    logger.error('Readiness check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Application metrics endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application metrics
 */
healthRoutes.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics: MetricsInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: env.NODE_ENV,
      version: env.npm_package_version,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    res.status(200).json(metrics);

    logger.info('Metrics requested', {
      uptime: metrics.uptime,
      memoryUsage: metrics.memory.heapUsed
    });

  } catch (error) {
    logger.error('Metrics collection failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: 'Metrics collection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /health/info:
 *   get:
 *     summary: Application information endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application information
 */
healthRoutes.get('/info', (req: Request, res: Response) => {
  try {
    const info = {
      name: 'Zephix User Authentication Service',
      version: env.npm_package_version,
      environment: env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json(info);

    logger.info('Info requested', {
      version: info.version,
      environment: info.environment
    });

  } catch (error) {
    logger.error('Info collection failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: 'Info collection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 