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
      logger: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn', 'log'] 
        : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);
    
    // Run migrations conditionally based on environment variable
    const runMigrationsOnBoot = configService.get<boolean>('database.runMigrationsOnBoot');
    if (runMigrationsOnBoot) {
      logger.log('Running database migrations...');
      try {
        const dataSource = app.get(DataSource);
        const migrations = await dataSource.runMigrations();
        if (migrations.length > 0) {
          logger.log(`Successfully ran ${migrations.length} migration(s):`);
          migrations.forEach(migration => {
            logger.log(`   - ${migration.name}`);
          });
        } else {
          logger.log('No pending migrations found');
        }
      } catch (migrationError) {
        logger.error('Database migration failed:', migrationError);
        // Don't exit - let the app start anyway to avoid deployment loops
        logger.warn('Application will start without running migrations');
      }
    } else {
      logger.log('Skipping database migrations (RUN_MIGRATIONS_ON_BOOT=false)');
    }

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
      app.use(helmet({
        crossOriginEmbedderPolicy: false, // Disable for API
        crossOriginResourcePolicy: { policy: "cross-origin" },
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
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: [
                "'self'", 
                "https://api.getzephix.com", 
                "https://getzephix.com", 
                "https://www.getzephix.com",
                "https://app.getzephix.com",
                "wss:", 
                "https:"
              ],
              fontSrc: ["'self'", "https:"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          },
        }),
      }));
    } else {
      logger.log('Security headers disabled');
    }

    // Configure global rate limiting with per-route overrides
    const rateLimitConfig = configService.get('security.rateLimit');
    
    if (rateLimitConfig.enabled) {
      logger.log(`Global rate limiting: ${rateLimitConfig.max} requests per ${rateLimitConfig.windowMs}ms per IP`);
      
      // Global rate limiter
      app.use(rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.max,
        skip: (req) => {
          // Skip rate limiting for health and status endpoints
          return req.path === '/api/health' || 
                 req.path === '/api/_status' ||
                 req.path === '/api/metrics';
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip || 'unknown',
        handler: (req, res) => {
          logger.warn(`Global rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
          res.status(429).json({
            statusCode: 429,
            message: 'Too Many Requests',
            error: 'Rate limit exceeded',
            retryAfter: Math.round(rateLimitConfig.windowMs / 1000),
          });
        }
      }));

      // Stricter rate limiting for auth endpoints
      logger.log(`Auth rate limiting: ${rateLimitConfig.authMax} requests per ${rateLimitConfig.authWindowMs}ms per IP`);
      const authRateLimit = rateLimit({
        windowMs: rateLimitConfig.authWindowMs,
        max: rateLimitConfig.authMax,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip || 'unknown',
        handler: (req, res) => {
          logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
          res.status(429).json({
            statusCode: 429,
            message: 'Too Many Authentication Attempts',
            error: 'Authentication rate limit exceeded',
            retryAfter: Math.round(rateLimitConfig.authWindowMs / 1000),
          });
        }
      });
      
      // Apply auth rate limiting to authentication endpoints
      app.use('/api/auth', authRateLimit);
    } else {
      logger.log('Rate limiting disabled');
    }

    // Global Validation Pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Set global API prefix
    app.setGlobalPrefix('api');

    // Enable graceful shutdown
    app.enableShutdownHooks();

    // Listen on PORT provided by environment or default 3000
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');

    logger.log(`Zephix Backend Service started successfully on port ${port}`);
    logger.log(`Health check: http://0.0.0.0:${port}/api/health`);
    logger.log(`Readiness check: http://0.0.0.0:${port}/api/ready`);

    // Graceful shutdown on SIGTERM and SIGINT
    ['SIGTERM', 'SIGINT'].forEach((signal) => {
      process.on(signal, async () => {
        logger.log(`Received ${signal}, shutting down gracefully...`);
        await app.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start application:', error.stack);
    process.exit(1);
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
          ...allowedOrigins.filter(origin => origin.includes('localhost') || origin.includes('127.0.0.1')),
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
      ...allowedOrigins.filter(origin => !origin.includes('localhost') && !origin.includes('127.0.0.1')),
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
