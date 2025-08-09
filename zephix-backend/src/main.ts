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
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);
    
    // Run migrations conditionally based on environment variable
    const runMigrationsOnBoot = configService.get<boolean>('database.runMigrationsOnBoot');
    if (runMigrationsOnBoot) {
      logger.log('🔄 Running database migrations...');
      try {
        const dataSource = app.get(DataSource);
        const migrations = await dataSource.runMigrations();
        if (migrations.length > 0) {
          logger.log(`✅ Successfully ran ${migrations.length} migration(s):`);
          migrations.forEach(migration => {
            logger.log(`   - ${migration.name}`);
          });
        } else {
          logger.log('✅ No pending migrations found');
        }
      } catch (migrationError) {
        logger.error('❌ Database migration failed:', migrationError);
        // Don't exit - let the app start anyway to avoid deployment loops
        logger.warn('⚠️  Application will start without running migrations');
      }
    } else {
      logger.log('⏸️  Skipping database migrations (RUN_MIGRATIONS_ON_BOOT=false)');
    }

    // Set trust proxy for proper IP detection behind proxies (Railway, CloudFlare, etc.)
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    // Enable CORS BEFORE Helmet - use configuration service for environment-specific settings
    const corsConfig = configService.get('security.cors');
    const allowedOrigins = corsConfig.allowedOrigins 
      ? corsConfig.allowedOrigins.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    
    logger.log(`🌐 CORS allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'All origins (dev mode)'}`);
    
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        // In development, allow all origins if no origins specified
        const isDevelopment = configService.get('environment') === 'development';
        if (isDevelopment && allowedOrigins.length === 0) {
          return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Reject origin
        logger.warn(`🚫 CORS rejected origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      },
      credentials: true,
      methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      allowedHeaders: 'Authorization,Content-Type,Accept,Origin,X-Requested-With',
      exposedHeaders: 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset',
      optionsSuccessStatus: 200, // Some legacy browsers choke on 204
      maxAge: 86400, // 24 hours preflight cache
    });

    // Apply Helmet security headers AFTER CORS
    const helmetConfig = configService.get('security.helmet');
    if (helmetConfig.enabled) {
      logger.log('🛡️  Security headers enabled via Helmet');
      app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        crossOriginEmbedderPolicy: false, // Disable for API
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
      }));
    } else {
      logger.log('🛡️  Security headers disabled');
    }

    // Configure global rate limiting with per-route overrides
    const rateLimitConfig = configService.get('security.rateLimit');
    
    if (rateLimitConfig.enabled) {
      logger.log(`⚡ Global rate limiting: ${rateLimitConfig.max} requests per ${rateLimitConfig.windowMs}ms per IP`);
      
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
          logger.warn(`🚫 Global rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
          res.status(429).json({
            statusCode: 429,
            message: 'Too Many Requests',
            error: 'Rate limit exceeded',
            retryAfter: Math.round(rateLimitConfig.windowMs / 1000),
          });
        }
      }));

      // Stricter rate limiting for auth endpoints
      logger.log(`🔐 Auth rate limiting: ${rateLimitConfig.authMax} requests per ${rateLimitConfig.authWindowMs}ms per IP`);
      const authRateLimit = rateLimit({
        windowMs: rateLimitConfig.authWindowMs,
        max: rateLimitConfig.authMax,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip || 'unknown',
        handler: (req, res) => {
          logger.warn(`🚫 Auth rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
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
      logger.log('⚡ Rate limiting disabled');
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

    // Listen on PORT provided by environment or default 3000
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Zephix Authentication Service running on port ${port}`);
    logger.log(
      `📊 Health check available at: http://localhost:${port}/api/health`,
    );

    // Graceful shutdown on SIGTERM and SIGINT
    ['SIGTERM', 'SIGINT'].forEach((signal) => {
      process.on(signal, async () => {
        logger.log(`Received ${signal}, shutting down gracefully...`);
        await app.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
