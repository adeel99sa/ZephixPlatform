import 'reflect-metadata';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { AppDataSource, DatabaseService, checkDatabaseHealth, closeDatabaseConnection, getDatabaseMetrics } from './infrastructure/config/database.config';
import { Logger, expressLogger, expressErrorLogger } from './infrastructure/logging/logger';
import { metricsService } from './infrastructure/monitoring/metrics.service';
import { AuthService } from './application/services/auth.service';
import { UserRepository } from './infrastructure/database/repositories/user.repository';
import { authMiddleware } from './api/middleware/auth.middleware';
import { authRoutes } from './api/routes/auth.routes';
import { healthRoutes } from './api/routes/health.routes';
import databaseRoutes from './api/routes/database.routes';
import { env } from './shared/types';

// Load environment variables
config();

/**
 * Main application class with enterprise-grade setup
 */
class Application {
  private app: express.Application;
  private server: any;
  private dataSource: any;
  private readonly logger = new Logger(Application.name);
  private readonly PORT = env.PORT || 3001;
  private readonly NODE_ENV = env.NODE_ENV || 'development';

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Sets up all middleware with security and performance optimizations
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-MFA-Token', 'X-Timestamp']
    }));

    // Compression
    this.app.use(compression());

    // Prometheus metrics middleware (must be before other middleware)
    this.app.use(metricsService.getMetricsMiddleware());

    // Request logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: {
        error: 'Too many authentication attempts',
        message: 'Please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        error: 'Too many requests',
        message: 'Please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting
    this.app.use('/api/auth', authLimiter);
    this.app.use('/', generalLimiter);
  }

  /**
   * Sets up all application routes
   */
  private setupRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRoutes);
    this.app.use('/ready', healthRoutes);

    // Database routes
    this.app.use('/api/database', databaseRoutes);

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        this.logger.error('Failed to get metrics', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);

    // API documentation
    this.app.use('/api-docs', express.static('docs/api'));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Zephix User Authentication Service',
        version: '1.0.0',
        environment: this.NODE_ENV,
        timestamp: new Date().toISOString(),
        correlationId: (req as any).correlationId
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        correlationId: (req as any).correlationId
      });
    });
  }

  /**
   * Sets up comprehensive error handling
   */
  private setupErrorHandling(): void {
    // Error logging middleware
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Express error', { error: error.message });
      next(error);
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const correlationId = (req as any).correlationId;

      // Record error metrics
      metricsService.recordHTTPError(
        req.method,
        req.path,
        error.status || 500,
        error.name || 'UnknownError'
      );

      this.logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        correlationId
      });

      // Don't leak error details in production
      const isProduction = this.NODE_ENV === 'production';
      const errorMessage = isProduction ? 'Internal Server Error' : error.message;

      res.status(error.status || 500).json({
        error: 'Internal Server Error',
        message: errorMessage,
        correlationId
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      this.gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', { reason, promise });
      this.gracefulShutdown();
    });
  }

  /**
   * Initializes the database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.connect();
      this.dataSource = dbService.getDataSource();
      (this.app as any).dataSource = this.dataSource;
      
      this.logger.info('Database initialized successfully');
    } catch (error) {
      this.logger.error('Database initialization failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Initializes application services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize repositories and services
      const userRepository = new UserRepository();
      // TODO: Fix AuthService interface compatibility
      const authService = new AuthService(userRepository);
      
      // Make services available to routes
      (this.app as any).authService = authService;
      
      this.logger.info('Services initialized successfully');
    } catch (error) {
      this.logger.error('Service initialization failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Starts the application server
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting application', {
        port: this.PORT,
        environment: this.NODE_ENV,
        timestamp: new Date().toISOString()
      });

      // Initialize database
      await this.initializeDatabase();

      // Initialize services
      await this.initializeServices();

      // Start periodic metrics updates
      this.startMetricsUpdates();

      // Start server
      this.server = this.app.listen(this.PORT, () => {
        this.logger.info('Server started successfully', {
          port: this.PORT,
          environment: this.NODE_ENV,
          timestamp: new Date().toISOString()
        });
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        this.logger.error('Server error', { error: error.message });
        process.exit(1);
      });

    } catch (error) {
      this.logger.error('Failed to start application', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    }
  }

  /**
   * Starts periodic metrics updates
   */
  private startMetricsUpdates(): void {
    // Update system metrics every 30 seconds
    setInterval(() => {
      metricsService.updateMemoryUsage();
      metricsService.updateCPUUsage();
    }, 30000);

    this.logger.info('Metrics updates started');
  }

  /**
   * Gracefully shuts down the application
   */
  async gracefulShutdown(): Promise<void> {
    this.logger.info('Graceful shutdown initiated');

    try {
      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            this.logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close database connection
      if (this.dataSource) {
        await closeDatabaseConnection(this.dataSource);
      }

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    }
  }

  /**
   * Gets the Express application instance
   * @returns {express.Application} Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }
}

// Start the application
const app = new Application();

// Handle uncaught promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

export default app; 