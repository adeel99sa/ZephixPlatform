// Initialize OpenTelemetry before importing anything else
import './telemetry';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto'; // Proper import of crypto
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting Zephix Backend...');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
    logger.log(`AI Service configured: ${!!process.env.ANTHROPIC_API_KEY}`);

    const app = await NestFactory.create(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);

    // ENHANCED: Safe migration handling that won't crash the app
    await handleMigrationsSafely(app, logger);

    // Set trust proxy for proper IP detection behind proxies (Railway, CloudFlare, etc.)
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    // Bulletproof CORS configuration for all environments
    const corsConfig = getCorsConfig();
    logger.log(`CORS Configuration: ${JSON.stringify(corsConfig, null, 2)}`);
    app.enableCors(corsConfig);

    // Apply Helmet security headers AFTER CORS
    const helmetConfig = configService.get('security.helmet');
    if (helmetConfig.enabled) {
      logger.log('Security headers enabled via Helmet');
      app.use(
        helmet({
          crossOriginEmbedderPolicy: false, // Disable for API
          crossOriginResourcePolicy: { policy: 'cross-origin' },
          noSniff: true,
          frameguard: { action: 'deny' },
          // Additional security for production
          ...(process.env.NODE_ENV === 'production' && {
            hsts: {
              maxAge: 31536000, // 1 year
              includeSubDomains: true,
              preload: true,
            },
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: [
                  "'self'",
                  'https://api.getzephix.com',
                  'https://getzephix.com',
                  'https://www.getzephix.com',
                  'https://app.getzephix.com',
                  'wss:',
                  'https:',
                ],
                fontSrc: ["'self'", 'https:'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
              },
            },
          }),
        }),
      );
    }

    // ENHANCED: Rate limiting with Railway-specific optimizations
    const rateLimitConfig = configService.get('security.rateLimit');
    if (rateLimitConfig.enabled) {
      logger.log('Rate limiting enabled');
      
      // General rate limiting
      app.use(
        rateLimit({
          windowMs: rateLimitConfig.windowMs,
          max: rateLimitConfig.max,
          message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000),
          },
          standardHeaders: true,
          legacyHeaders: false,
          // Railway-specific optimizations
          skip: (req) => {
            // Skip health checks and internal routes
            return req.path === '/api/health' || req.path.startsWith('/api/metrics');
          },
        }),
      );

      // Stricter rate limiting for authentication endpoints
      app.use(
        '/api/auth',
        rateLimit({
          windowMs: rateLimitConfig.authWindowMs,
          max: rateLimitConfig.authMax,
          message: {
            error: 'Too many authentication attempts, please try again later.',
            retryAfter: Math.ceil(rateLimitConfig.authWindowMs / 1000),
          },
          standardHeaders: true,
          legacyHeaders: false,
        }),
      );
    }

    // ENHANCED: Global validation pipe with better error handling
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        // Better error messages for Railway debugging
        exceptionFactory: (errors) => {
          const formattedErrors = errors.map((error) => ({
            field: error.property,
            value: error.value,
            constraints: error.constraints,
            children: error.children,
          }));
          
          logger.warn('Validation errors:', formattedErrors);
          
          return new Error(
            `Validation failed: ${formattedErrors
              .map((e) => Object.values(e.constraints || {}).join(', '))
              .join('; ')}`,
          );
        },
      }),
    );

    // ENHANCED: Global exception filter for better error handling
    app.useGlobalFilters(
      new GlobalExceptionFilter(logger),
    );

    // ENHANCED: Global interceptor for request logging
    app.useGlobalInterceptors(
      new RequestLoggingInterceptor(logger),
    );

    // ENHANCED: Global guard for organization scoping
    app.useGlobalGuards(
      new OrganizationScopeGuard(logger),
    );

    // Get port from environment or configuration
    const port = configService.get('port') || process.env.PORT || 3000;
    
    // ENHANCED: Graceful shutdown handling for Railway
    const server = await app.listen(port, '0.0.0.0');
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Close server
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
        
        // Close database connections
        const dataSource = app.get(DataSource);
        if (dataSource.isInitialized) {
          await dataSource.destroy();
          logger.log('Database connections closed');
        }
        
        logger.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    logger.log(`🚀 Zephix Backend is running on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/api/health`);
    logger.log(`📈 Metrics available at: http://localhost:${port}/api/metrics`);
    
    // ENHANCED: Railway-specific startup message
    if (process.env.NODE_ENV === 'production') {
      logger.log('🚂 Railway production environment detected');
      logger.log('🔒 SSL and security headers enabled');
      logger.log('📊 Production logging configured');
    }

  } catch (error) {
    logger.error('❌ Failed to start Zephix Backend:', error);
    
    // ENHANCED: Better error reporting for Railway
    if (process.env.NODE_ENV === 'production') {
      logger.error('Production startup failure - check logs and restart');
    }
    
    process.exit(1);
  }
}

/**
 * ENHANCED: Safe migration handling that won't crash the application
 */
async function handleMigrationsSafely(app: any, logger: Logger): Promise<void> {
  try {
    // Check if migrations should run on startup
    const runMigrationsOnBoot = process.env.RUN_MIGRATIONS_ON_BOOT === 'true';
    
    if (!runMigrationsOnBoot) {
      logger.log('Migrations disabled on boot - run manually via CLI');
      return;
    }

    logger.log('🔄 Running database migrations...');
    
    try {
      const dataSource = app.get(DataSource);
      
      // Wait for database connection
      if (!dataSource.isInitialized) {
        logger.log('Waiting for database connection...');
        await dataSource.initialize();
      }
      
      // Run migrations with timeout protection
      const migrationPromise = dataSource.runMigrations();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Migration timeout')), 300000) // 5 minutes
      );
      
      const migrations = await Promise.race([migrationPromise, timeoutPromise]);
      
      if (migrations.length > 0) {
        logger.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach((migration: any) => {
          logger.log(`   - ${migration.name}`);
        });
      } else {
        logger.log('ℹ️  No pending migrations found');
      }
      
    } catch (migrationError) {
      logger.error('❌ Database migration failed:', migrationError);
      
      // ENHANCED: Don't crash the app, just log the error
      logger.warn('⚠️  Application will start without running migrations');
      logger.warn('💡 Run migrations manually: npm run migration:run:consolidated');
      
      // Continue with app startup
      return;
    }
    
  } catch (error) {
    logger.error('❌ Migration handling error:', error);
    logger.warn('⚠️  Application will start without migration handling');
  }
}

/**
 * Bulletproof CORS configuration for all environments
 */
function getCorsConfig() {
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalDev = process.env.LOCAL_DEV === 'true';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // Development environment
  if (isDev) {
    if (isLocalDev) {
      // Local development (no Vite proxy)
      return {
        origin: [
          'http://localhost:5173', // Vite default
          'http://localhost:3000', // Vite custom port
          'http://localhost:4173', // Vite preview
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:4173',
        ],
        credentials: false, // No credentials for local dev
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Authorization',
          'Content-Type',
          'Accept',
          'Origin',
          'X-Requested-With',
          'X-Org-Id',
          'X-Request-Id',
        ],
        exposedHeaders: [
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
          'X-Request-Id',
        ],
        optionsSuccessStatus: 204,
        maxAge: 86400, // 24 hours
        preflightContinue: false,
      };
    } else {
      // Development with Vite proxy (default)
      return {
        origin: [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:4173',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:4173',
          // Add any additional dev origins
          ...allowedOrigins.filter(
            (origin) =>
              origin.includes('localhost') || origin.includes('127.0.0.1'),
          ),
        ],
        credentials: true, // Credentials for Vite proxy
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Authorization',
          'Content-Type',
          'Accept',
          'Origin',
          'X-Requested-With',
          'X-Org-Id',
          'X-Request-Id',
        ],
        exposedHeaders: [
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
          'X-Request-Id',
        ],
        optionsSuccessStatus: 204,
        maxAge: 86400,
        preflightContinue: false,
      };
    }
  }

  // Production environment
  return {
    origin: [
      'https://getzephix.com',
      'https://www.getzephix.com',
      'https://app.getzephix.com',
      // Add any additional production origins
      ...allowedOrigins.filter(
        (origin) =>
          !origin.includes('localhost') && !origin.includes('127.0.0.1'),
      ),
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Org-Id',
      'X-Request-Id',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-Id',
    ],
    optionsSuccessStatus: 204,
    maxAge: 86400,
    preflightContinue: false,
  };
}

bootstrap();
// Updated: Mon Aug 11 22:23:35 CDT 2025
