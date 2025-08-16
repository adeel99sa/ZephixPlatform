// Initialize OpenTelemetry before importing anything else
import './telemetry';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto'; // Proper import of crypto
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dataSource from './data-source'; // Use the default export

// Non-blocking migrations function
async function runMigrationsNonBlocking() {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await dataSource.runMigrations();
    console.log('✅ Migrations complete');
  } catch (e) {
    console.error('❌ Migrations failed:', e);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting Zephix Backend...');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
    logger.log(`AI Service configured: ${!!process.env.ANTHROPIC_API_KEY}`);

    logger.log('🔍 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    logger.log('✅ NestJS application created successfully');

    // Get configuration service
    logger.log('🔍 Getting configuration service...');
    const configService = app.get(ConfigService);
    logger.log('✅ Configuration service obtained');

    // ENHANCED: Safe migration handling that won't crash the app
    logger.log('🔍 Handling migrations...');
    await handleMigrationsSafely(app, logger);
    logger.log('✅ Migrations handled successfully');

    // Set trust proxy for proper IP detection behind proxies (Railway, CloudFlare, etc.)
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    // CRITICAL: Restore CORS configuration for frontend-backend communication
    const corsConfig = {
      origin: process.env.FRONTEND_URL || 'https://zephix-frontend-production.up.railway.app',
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
        'X-CSRF-Token',
        'X-Forwarded-For',
        'X-Real-IP',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-Id',
        'X-Total-Count',
        'X-Page-Count',
      ],
      optionsSuccessStatus: 204,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
    };
    
    app.enableCors(corsConfig);
    logger.log('CORS enabled for frontend-backend communication');
    logger.log(`Frontend URL: ${process.env.FRONTEND_URL || 'https://zephix-frontend-production.up.railway.app'}`);
    
    // CRITICAL: Set global API prefix for all routes EXCEPT health
    // REMOVED: Global prefix that would create /api/api/auth/* routes
    // app.setGlobalPrefix('api', { exclude: ['health'] });
    logger.log('No global prefix - routes use their original paths');
    
    // Run migrations non-blocking (fire and forget)
    runMigrationsNonBlocking();
    
    // CRITICAL: Debug module loading and route registration
    logger.log('🔍 Checking module imports...');
    try {
      const appModule = app.get(AppModule);
      logger.log('✅ AppModule loaded successfully');
      
      // Check if AuthModule is accessible
      const authModule = app.get('AuthModule');
      logger.log('🔐 AuthModule accessible:', !!authModule);
    } catch (error) {
      logger.error('❌ Error checking modules:', error.message);
    }

    // CRITICAL: Add request logging middleware to debug HTTP requests
    app.use((req: any, res: any, next: any) => {
      const timestamp = new Date().toISOString();
      const method = req.method;
      const url = req.url;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ip = req.ip || req.connection.remoteAddress || 'Unknown';
      
      console.log(`🌐 [${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);
      
      // Log request body for debugging (excluding sensitive data)
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
        console.log(`📦 Request Body: ${JSON.stringify(sanitizedBody)}`);
      }
      
      next();
    });

    // CRITICAL: Add response logging middleware
    app.use((req: any, res: any, next: any) => {
      const originalSend = res.send;
      res.send = function(data: any) {
        const timestamp = new Date().toISOString();
        const statusCode = res.statusCode;
        console.log(`📤 [${timestamp}] ${req.method} ${req.url} - Status: ${statusCode}`);
        originalSend.call(this, data);
      };
      next();
    });

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
                  'https://zephix-frontend-production.up.railway.app',
                  'https://zephix-backend-production.up.railway.app',
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

    // CRITICAL: Verify critical services before binding to port
    logger.log('🔍 Verifying critical services before startup...');
    try {
      // Verify AuthModule loaded and AuthController is available
      const authController = app.get('AuthController');
      logger.log('🔐 AuthController available:', !!authController);
      
      if (!authController) {
        logger.error('❌ CRITICAL: AuthController not available - authentication will fail');
        throw new Error('AuthController not available');
      }
      
      // Verify SharedModule global services
      const llmProvider = app.get('LLMProviderService');
      logger.log('🤖 LLMProviderService available:', !!llmProvider);
      
      const claudeService = app.get('ClaudeService');
      logger.log('🧠 ClaudeService available:', !!claudeService);
      
      // Verify HealthModule
      const healthController = app.get('HealthController');
      logger.log('🏥 HealthController available:', !!healthController);
      
      logger.log('✅ All critical services verified successfully');
    } catch (error) {
      logger.error('❌ CRITICAL: Service verification failed:', error.message);
      logger.error('Stack trace:', error.stack);
      throw new Error(`Critical service verification failed: ${error.message}`);
    }
    
    // Only then bind to port
    const port = Number(process.env.PORT || 3000);
    
    // CRITICAL: Log port binding information
    logger.log(`🔌 Binding to port: ${port}`);
    logger.log(`🌐 Binding to host: 0.0.0.0 (all interfaces)`);
    logger.log(`🚂 Railway PORT env: ${process.env.PORT || 'Not set'}`);
    
    // ENHANCED: Graceful shutdown handling for Railway
    const server = await app.listen(port, '0.0.0.0');
    
    // CRITICAL: Verify server is listening
    if (server.listening) {
      logger.log(`✅ Server successfully bound to port ${port}`);
      logger.log(`🌐 Server address: ${server.address()}`);
    } else {
      logger.error(`❌ Server failed to bind to port ${port}`);
      throw new Error(`Server binding failed on port ${port}`);
    }

    // CRITICAL: Debug route registration
    logger.log('🔍 Checking registered routes...');
    try {
      const router = app.getHttpAdapter().getInstance()._router;
      if (router && router.stack) {
        logger.log(`📋 Total middleware stack items: ${router.stack.length}`);
        
        // Log route information
        router.stack.forEach((layer: any, index: number) => {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods).filter(method => layer.route.methods[method]);
            logger.log(`🛣️  Route ${index}: ${methods.join(',')} ${layer.route.path}`);
          }
        });

        // SPECIFIC: Verify AuthModule routes are registered
        const authRoutes = router.stack.filter((layer: any) => 
          layer.route?.path?.includes('/auth')
        );
        logger.log(`🔐 Auth routes found: ${authRoutes.length}`);
        authRoutes.forEach((route: any, index: number) => {
          const methods = Object.keys(route.route.methods).filter(method => route.route.methods[method]);
          logger.log(`🔐 Auth route ${index}: ${methods.join(',')} ${route.route.path}`);
        });

        if (authRoutes.length === 0) {
          logger.error('❌ NO AUTH ROUTES FOUND - AuthModule failed to register routes');
        } else {
          logger.log('✅ AuthModule routes successfully registered');
        }
      } else {
        logger.warn('⚠️  Router stack not accessible for debugging');
      }
    } catch (error) {
      logger.error('❌ Error checking routes:', error.message);
    }

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
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
  const frontendUrl = process.env.FRONTEND_URL;
  const backendUrl = process.env.BACKEND_URL;

  // Production environment (Railway)
  if (!isDev) {
    const productionOrigins = [
      'https://zephix-frontend-production.up.railway.app',
      'https://getzephix.com',
      'https://www.getzephix.com',
      'https://app.getzephix.com',
      // Add any additional production origins from environment
      ...allowedOrigins.filter(
        (origin) =>
          origin.includes('railway.app') || 
          origin.includes('getzephix.com') ||
          origin.includes('vercel.app') ||
          origin.includes('netlify.app')
      ),
    ];

    // Remove duplicates and filter out empty strings
    const uniqueProductionOrigins = [...new Set(productionOrigins)].filter(Boolean);

    return {
      origin: uniqueProductionOrigins,
      credentials: true, // Enable credentials for JWT authentication
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'Accept',
        'Origin',
        'X-Requested-With',
        'X-Org-Id',
        'X-Request-Id',
        'X-CSRF-Token',
        'X-Forwarded-For',
        'X-Real-IP',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-Id',
        'X-Total-Count',
        'X-Page-Count',
      ],
      optionsSuccessStatus: 204,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
    };
  }

  // Development environment
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

bootstrap();

// CRITICAL: Railway container fixes
// Handle graceful shutdown for SIGTERM
process.on('SIGTERM', () => {
  console.log('🚨 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🚨 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Monitor memory usage to prevent Railway container kills
setInterval(() => {
  const used = process.memoryUsage();
  const rssMB = Math.round(used.rss / 1024 / 1024);
  const heapMB = Math.round(used.heapUsed / 1024 / 1024);
  const externalMB = Math.round(used.external / 1024 / 1024);
  
  console.log(`📊 Memory Usage - RSS: ${rssMB}MB, Heap: ${heapMB}MB, External: ${externalMB}MB`);
  
  // Warning if memory usage is high (Railway typically has 512MB-1GB limits)
  if (rssMB > 400) {
    console.warn(`⚠️  High memory usage detected: ${rssMB}MB - Railway may kill container`);
  }
}, 30000); // Check every 30 seconds

// Monitor for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Log Railway environment information
console.log('🚂 Railway Environment Info:');
console.log(`   PORT: ${process.env.PORT || 'Not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log(`   SKIP_DATABASE: ${process.env.SKIP_DATABASE || 'Not set'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
console.log(`   Memory Limit: ${process.env.RAILWAY_MEMORY_LIMIT || 'Not set'}`);
console.log(`   CPU Limit: ${process.env.RAILWAY_CPU_LIMIT || 'Not set'}`);

// Updated: Mon Aug 11 22:23:35 CDT 2025
