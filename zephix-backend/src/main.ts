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

    // Enable CORS BEFORE Helmet - use function for origin validation
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Reject origin
        logger.warn(`🚫 CORS rejected origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      },
      credentials: true,
      methods: 'GET,HEAD,POST,PUT,PATCH,DELETE',
      allowedHeaders: 'Authorization,Content-Type',
      optionsSuccessStatus: 204
    });

    // Apply Helmet security headers AFTER CORS
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
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API
    }));

    // Configure rate limiting
    const enabled = process.env.RATE_LIMIT_ENABLED === 'true';
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
    const max = Number(process.env.RATE_LIMIT_MAX || 100);
    
    if (enabled) {
      logger.log(`⚡ Rate limiting enabled: ${max} requests per ${windowMs}ms window`);
      app.use(rateLimit({
        windowMs,
        max,
        skip: req => req.path === '/api/health',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          logger.warn(`🚫 Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
          res.status(429).json({
            statusCode: 429,
            message: 'Too Many Requests',
            error: 'Rate limit exceeded'
          });
        }
      }));
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
