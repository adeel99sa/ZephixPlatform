import * as dotenv from 'dotenv';
dotenv.config();
import 'reflect-metadata';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

// Enterprise-secure SSL override for Railway PostgreSQL
if (
  process.env.NODE_ENV === 'production' &&
  process.env.DATABASE_URL?.includes('railway')
) {
  console.warn(
    '🔐 SECURITY WARNING: Disabling SSL validation for Railway PostgreSQL compatibility',
  );
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // CRITICAL: Set Railway-specific SSL configuration
  if (!process.env.RAILWAY_SSL_REJECT_UNAUTHORIZED) {
    process.env.RAILWAY_SSL_REJECT_UNAUTHORIZED = 'false';
  }
  if (!process.env.DATABASE_SSL_MODE) {
    process.env.DATABASE_SSL_MODE = 'require';
  }

  console.log('🔒 Railway SSL configuration set:');
  console.log(
    `   RAILWAY_SSL_REJECT_UNAUTHORIZED: ${process.env.RAILWAY_SSL_REJECT_UNAUTHORIZED}`,
  );
  console.log(`   DATABASE_SSL_MODE: ${process.env.DATABASE_SSL_MODE}`);
}

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
const cookieParser = require('cookie-parser')
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter'
import * as crypto from 'crypto'
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  console.log('🚀 Creating NestJS application...');
  const app = await NestFactory.create(AppModule)

  // Hard fail if JWT secret is missing (prevents silent 401s)
  const cfg = app.get(ConfigService);
  const jwtSecret = cfg.get<string>('jwt.secret') || process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 10) {
    console.error('FATAL: jwt.secret is missing. Check .env / ConfigModule envFilePath.');
    process.exit(1);
  }
  console.log('✅ JWT secret loaded successfully');

  // Quick-fail guard rail to prevent regressions
  if (!cfg.get<string>('jwt.secret')) {
    throw new Error('FATAL: jwt.secret missing (check .env / envFilePath)');
  }


  console.log('🔧 Setting global prefix...');
  app.setGlobalPrefix('api')

  console.log('🛡️ Configuring security middleware...');
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' }
  }))

  console.log('🍪 Configuring cookie parser...');
  app.use(cookieParser())

  console.log('🌐 Configuring CORS...');
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? [
          'https://getzephix.com',           // Production frontend
          'https://www.getzephix.com',       // Production with www
        ]
      : /^http:\/\/localhost:\d+$/,         // Any localhost port in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-org-id'],
    exposedHeaders: ['X-Request-Id'],
  })

  console.log('🆔 Configuring request ID middleware...');
  app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || crypto.randomUUID()
    res.setHeader('X-Request-Id', String(rid))
    // @ts-ignore
    req.id = rid
    next()
  })

  console.log('✅ Configuring global validation pipe...');
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }))

  // Add response transformation interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  console.log('🚨 Configuring global exception filters...');
  // ✅ Register DB filter first, then generic (DB runs first)
  app.useGlobalFilters(
    new DatabaseExceptionFilter(),
    new AllExceptionsFilter(),
  );

  const port = process.env.PORT || 3000;
  console.log('🚀 Starting server on port:', port);
  await app.listen(port, '0.0.0.0') // Bind to all interfaces for Railway
  
  console.log('✅ Application is running on:', `http://localhost:${port}`);
  console.log('✅ API endpoints available at:', `http://localhost:${port}/api`);
  
  // Post-startup router verification
  const server = app.getHttpServer();
  if (server._router && server._router.stack) {
    const routes = server._router.stack.filter(layer => layer.route);
    console.log(`🎯 Router verification: ${routes.length} routes registered in Express stack`);
    
    // DEV: dump routes (Express only)
    const httpAdapter = app.getHttpAdapter();
    const instance: any = httpAdapter.getInstance?.();
    if (instance?._router?.stack) {
      const routes = [];
      instance._router.stack.forEach((r: any) => {
        if (r.route && r.route.path) {
          const methods = Object.keys(r.route.methods)
            .filter(Boolean)
            .map(m => m.toUpperCase())
            .join(',');
          routes.push(`${methods} ${r.route.path}`);
        }
      });
      console.log('🛣  Registered routes:\n', routes.sort().join('\n '));
    }
  } else {
    console.log('⚠️ Warning: Router stack not found after startup');
  }
}

bootstrap().catch(err => {
  console.error('❌ Application failed to start:', err);
  process.exit(1);
});

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

  console.log(
    `📊 Memory Usage - RSS: ${rssMB}MB, Heap: ${heapMB}MB, External: ${externalMB}MB`,
  );

  // Warning if memory usage is high (Railway typically has 512MB-1GB limits)
  if (rssMB > 400) {
    console.warn(
      `⚠️  High memory usage detected: ${rssMB}MB - Railway may kill container`,
    );
  }
}, 30000); // Check every 30 seconds

// Monitor for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
});

// Log Railway environment information
console.log('🚂 Railway Environment Info:');
console.log(`   PORT: ${process.env.PORT || 'Not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log(`   SKIP_DATABASE: ${process.env.SKIP_DATABASE || 'Not set'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
console.log(
  `   Memory Limit: ${process.env.RAILWAY_MEMORY_LIMIT || 'Not set'}`,
);
console.log(`   CPU Limit: ${process.env.RAILWAY_CPU_LIMIT || 'Not set'}`);