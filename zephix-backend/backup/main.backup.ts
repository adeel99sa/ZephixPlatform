import * as dotenv from 'dotenv';
dotenv.config();
import 'reflect-metadata';

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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
const cookieParser = require('cookie-parser');
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import * as crypto from 'crypto';

async function bootstrap() {
  console.log('🚀 Creating NestJS application...');
  const app = await NestFactory.create(AppModule);

  console.log('🔧 Setting global prefix...');
  app.setGlobalPrefix('api');

  console.log('🛡️ Configuring security middleware...');
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    }),
  );

  console.log('🍪 Configuring cookie parser...');
  app.use(cookieParser());

  console.log('🌐 Configuring CORS...');
  app.enableCors({
    origin: [
      'https://getzephix.com', // Production frontend
      'https://www.getzephix.com', // Production with www
      'http://localhost:5173', // Vite local development
      'http://localhost:3001', // Alternative frontend port
      'http://localhost:3000', // Alternative frontend port
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });

  console.log('🆔 Configuring request ID middleware...');
  app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', String(rid));
    // @ts-ignore
    req.id = rid;
    next();
  });

  console.log('✅ Configuring global validation pipe...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  console.log('🚨 Configuring global exception filter...');
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  console.log('🚀 Starting server on port:', port);
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for Railway

  console.log('✅ Application is running on:', `http://localhost:${port}`);
  console.log('✅ API endpoints available at:', `http://localhost:${port}/api`);

  // Post-startup router verification
  const server = app.getHttpServer();
  if (server._router && server._router.stack) {
    const routes = server._router.stack.filter((layer) => layer.route);
    console.log(
      `🎯 Router verification: ${routes.length} routes registered in Express stack`,
    );
  } else {
    console.log('⚠️ Warning: Router stack not found after startup');
  }
}

bootstrap().catch((err) => {
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
console.log(
  `   Memory Limit: ${process.env.RAILWAY_MEMORY_LIMIT || 'Not set'}`,
);
console.log(`   CPU Limit: ${process.env.RAILWAY_CPU_LIMIT || 'Not set'}`);
