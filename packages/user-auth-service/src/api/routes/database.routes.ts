import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../infrastructure/config/database.config';
import { Logger } from '../../infrastructure/logging/logger';

const router = Router();
const logger = new Logger('DatabaseRoutes');

/**
 * @swagger
 * /api/database/health:
 *   get:
 *     summary: Database health check endpoint
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Database is healthy
 *       503:
 *         description: Database is unhealthy
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbService = DatabaseService.getInstance();
    const healthCheck = await dbService.healthCheck();
    
    if (healthCheck.status === 'healthy') {
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        details: healthCheck.details,
        stats: healthCheck.stats
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        details: healthCheck.details,
        stats: healthCheck.stats
      });
    }
  } catch (error) {
    logger.error('Database health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(503).json({
      status: 'error',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/database/info:
 *   get:
 *     summary: Database information endpoint (development only)
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Database information
 *       404:
 *         description: Not found (production)
 */
router.get('/info', async (req: Request, res: Response): Promise<void> => {
  if (process.env['NODE_ENV'] !== 'development') {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  try {
    const dbService = DatabaseService.getInstance();
    const dataSource = dbService.getDataSource();
    
    res.json({
      database: process.env['DB_DATABASE'],
      host: process.env['DB_HOST'],
      port: process.env['DB_PORT'],
      isConnected: dataSource.isInitialized,
      entities: dataSource.entityMetadatas.map(entity => entity.name),
      migrations: dataSource.migrations.map(migration => migration.name),
      connectionStats: dbService.getConnectionStats()
    });
  } catch (error) {
    logger.error('Database info request failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({
      error: 'Failed to retrieve database information',
    });
  }
});

/**
 * @swagger
 * /api/database/stats:
 *   get:
 *     summary: Database statistics endpoint
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Database statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbService = DatabaseService.getInstance();
    const stats = dbService.getConnectionStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      stats: {
        isInitialized: stats.isInitialized,
        isConnected: stats.isConnected,
        connectionCount: stats.connectionCount,
        queryCount: stats.queryCount,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Database stats request failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({
      error: 'Failed to retrieve database statistics',
    });
  }
});

/**
 * @swagger
 * /api/database/test:
 *   post:
 *     summary: Test database connection endpoint
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Connection test successful
 *       500:
 *         description: Connection test failed
 */
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbService = DatabaseService.getInstance();
    const isHealthy = await dbService.testConnection();
    
    if (isHealthy) {
      res.status(200).json({
        success: true,
        message: 'Database connection test successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database connection test failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Database connection test failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 