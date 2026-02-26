import * as dotenv from 'dotenv';
dotenv.config();
import 'reflect-metadata';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { EnvelopeInterceptor } from './shared/interceptors/envelope.interceptor';
import { ApiErrorFilter } from './shared/filters/api-error.filter';
import { RequestContextLoggerInterceptor } from './common/interceptors/request-context-logger.interceptor';

/**
 * Helper to parse environment variable as boolean
 * Returns true only if value is explicitly "true" (case-insensitive)
 */
const isTrue = (v?: string): boolean => (v || '').toLowerCase() === 'true';

// CRITICAL: Never disable TLS verification in production
// Railway PostgreSQL uses proper SSL certificates - use SSL mode 'require' in connection string
// Do NOT set NODE_TLS_REJECT_UNAUTHORIZED=0 - it disables all TLS verification
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.error(
    '❌ SECURITY ERROR: NODE_TLS_REJECT_UNAUTHORIZED=0 is set. This disables TLS verification and is insecure.',
  );
  console.error(
    '   Remove this from Railway environment variables. Use proper SSL configuration instead.',
  );
  if (process.env.NODE_ENV === 'production') {
    console.error('   Exiting in production to prevent insecure deployment.');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT ↔ DATABASE SAFETY GUARD
// Prevents staging from hitting production Postgres and vice versa.
// Uses ZEPHIX_ENV (explicit) over NODE_ENV (overloaded by frameworks).
// ═══════════════════════════════════════════════════════════════════════════
import { validateDbWiring } from './common/utils/db-safety-guard';
{
  const zephixEnv = process.env.ZEPHIX_ENV || '';
  const dbUrl = process.env.DATABASE_URL || '';
  if (zephixEnv && dbUrl) {
    const result = validateDbWiring(zephixEnv, dbUrl);
    if (!result.safe) {
      console.error(`❌ DB SAFETY GUARD: ${result.message}`);
      process.exit(1);
    }
    console.log(`✅ DB SAFETY GUARD: ${result.message}`);
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseVerifyService } from './modules/database/database-verify.service';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import helmet from 'helmet';
const cookieParser = require('cookie-parser');
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import * as crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  CORS_ALLOWED_HEADERS,
  CORS_EXPOSED_HEADERS,
} from './common/http/cors-headers';
import {
  assertStagingEmailVerificationBypassGuardrails,
  isStagingEmailVerificationBypassFlagEnabled,
} from './modules/auth/services/staging-email-verification-bypass';
import { isStagingRuntime } from './common/utils/runtime-env';

/** Rewrite /api/v1/* to /api/* so existing controllers serve v1 without path changes. */
function v1RewriteMiddleware(req: Request, _res: Response, next: NextFunction) {
  const path = req.path || req.url?.split('?')[0] || '';
  if (path.startsWith('/api/v1/')) {
    const q = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = '/api' + path.slice(7) + q;
  }
  next();
}

/** Set deprecation headers on legacy /api/* (not /api/v1/*) responses. */
function legacyDeprecationHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const p = req.path || req.url?.split('?')[0] || '';
  const isLegacyApi = p.startsWith('/api/') && !p.startsWith('/api/v1/');
  if (isLegacyApi) {
    const sunset = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunset);
    res.setHeader('Link', '</api/v1/>; rel="successor-version"');
  }
  next();
}

/** Stamp every response with X-Zephix-Env so operators can confirm env from any curl/browser. */
function zephixEnvHeader(_req: Request, res: Response, next: NextFunction) {
  const env = process.env.ZEPHIX_ENV || process.env.NODE_ENV || 'unknown';
  res.setHeader('X-Zephix-Env', env);
  next();
}

const debugBoot = process.env.DEBUG_BOOT === 'true';

async function bootstrap() {
  console.log('BOOT_START', new Date().toISOString());
  if (debugBoot) {
    console.log('BOOT_ENV', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      AUTO_MIGRATE: process.env.AUTO_MIGRATE,
      DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
    });
  }
  // Skip env validation in UNIT TEST mode only.
  // Unit tests use Test.createTestingModule, not bootstrap().
  // Railway's "test" environment (NODE_ENV=test) MUST boot normally.
  // JEST_WORKER_ID is set by Jest; VITEST is set by Vitest.
  if (process.env.JEST_WORKER_ID || process.env.VITEST) {
    console.log('BOOT_SKIP: detected test runner (JEST_WORKER_ID or VITEST) — returning early');
    return;
  }

  assertStagingEmailVerificationBypassGuardrails();

  // Validate required environment variables at startup
  const requiredEnvVars: Record<
    string,
    { value: string | undefined; minLength?: number; description: string }
  > = {
    INTEGRATION_ENCRYPTION_KEY: {
      value: process.env.INTEGRATION_ENCRYPTION_KEY,
      minLength: 32,
      description:
        'Encryption key for integration secrets (AES-256 requires 32+ chars)',
    },
    REFRESH_TOKEN_PEPPER: {
      value: process.env.REFRESH_TOKEN_PEPPER,
      minLength: 32,
      description:
        'Pepper for refresh token hashing (min 32 chars); fail fast if missing or too short',
    },
    JWT_SECRET: {
      value: process.env.JWT_SECRET,
      minLength: 32,
      description:
        'Secret for signing access tokens (min 32 chars)',
    },
    JWT_REFRESH_SECRET: {
      value: process.env.JWT_REFRESH_SECRET,
      minLength: 32,
      description:
        'Secret for signing refresh tokens (min 32 chars)',
    },
  };

  const WEAK_SECRET_PATTERNS = ['secret', 'password', '123', 'changeme', 'test', 'default', 'admin'];
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const val = requiredEnvVars[key]?.value?.toLowerCase();
    if (val && WEAK_SECRET_PATTERNS.some(p => val === p || val.startsWith(p))) {
      console.error(`❌ ${key} matches a known weak pattern. Use a cryptographically random value (e.g., openssl rand -hex 32).`);
      process.exit(1);
    }
  }

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    if (!config.value) {
      missing.push(key);
    } else if (config.minLength && config.value.length < config.minLength) {
      invalid.push(`${key} (must be at least ${config.minLength} characters)`);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('❌ Missing or invalid required environment variables:');
    missing.forEach((key) => {
      console.error(`   - ${key}: Missing`);
      console.error(`     ${requiredEnvVars[key].description}`);
    });
    invalid.forEach((key) => {
      console.error(`   - ${key}: Invalid`);
    });
    console.error('\n💡 Set these variables in Railway → Variables tab');
    process.exit(1);
  }

  console.log('BOOT_BEFORE_NEST_CREATE', new Date().toISOString());
  const app = await NestFactory.create(AppModule, {
    logger: debugBoot
      ? ['log', 'warn', 'error', 'debug', 'verbose']
      : ['error', 'warn', 'log'],
  });
  console.log('BOOT_AFTER_NEST_CREATE', new Date().toISOString());

  const env = process.env.NODE_ENV || 'development';
  if (isStagingRuntime()) {
    const skipEmailVerification =
      isStagingEmailVerificationBypassFlagEnabled();
    console.log(
      `EMAIL_VERIFICATION_POLICY staging bypassEnabled=${skipEmailVerification}`,
    );
  }
  if (env === 'production' || env === 'staging') {
    process.env.AUTO_MIGRATE = 'false';
  }

  if (process.env.SKIP_DATABASE !== 'true') {
    const verifier = app.get(DatabaseVerifyService);
    await verifier.verifyOnBoot();

    // ─── POST-CONNECTION DB IDENTITY PROOF ─────────────────────────
    // Log the ACTUAL database identity from the live connection.
    // Hostname alone is NOT proof — we need inet_server_addr() and
    // system_identifier to prove which Postgres cluster we connected to.
    try {
      const { DataSource } = require('typeorm');
      const ds = app.get(DataSource);

      const identity = await ds.query(
        `SELECT current_database() as db,
                inet_server_addr() as addr,
                inet_server_port() as port`,
      );

      // system_identifier uniquely identifies the Postgres cluster
      const cluster = await ds.query(
        `SELECT system_identifier FROM pg_control_system()`,
      ).catch(() => [{ system_identifier: '(unavailable)' }]);

      // db_oid confirms correct database within the cluster
      const dbOid = await ds.query(
        `SELECT oid FROM pg_database WHERE datname = current_database()`,
      ).catch(() => [{ oid: '(unavailable)' }]);

      const migrationCount = await ds.query(
        `SELECT COUNT(*) as count FROM migrations`,
      ).catch(() => [{ count: '0' }]);

      const latestMigration = await ds.query(
        `SELECT name FROM migrations ORDER BY id DESC LIMIT 1`,
      ).catch(() => [{ name: '(none)' }]);

      const id = identity?.[0] || {};
      const sysId = cluster?.[0]?.system_identifier || '(unavailable)';
      const oid = dbOid?.[0]?.oid || '(unavailable)';
      console.log(
        `✅ DB IDENTITY PROOF: database=${id.db} serverAddr=${id.addr} serverPort=${id.port} ` +
        `systemIdentifier=${sysId} dbOid=${oid} ` +
        `migrations=${migrationCount?.[0]?.count} latest=${latestMigration?.[0]?.name}`,
      );
    } catch (e) {
      console.warn(`⚠️ DB IDENTITY PROOF: could not query — ${(e as Error)?.message}`);
    }
  }

  // Trust proxy — Railway (and most PaaS) sits behind a reverse proxy.
  // TRUST_PROXY_DEPTH controls how Express resolves req.ip via x-forwarded-for.
  const { validateTrustProxyDepth } = require('./common/rate-limit/ip-resolver');
  const trustProxyDepth = parseInt(process.env.TRUST_PROXY_DEPTH || '1', 10);
  validateTrustProxyDepth(trustProxyDepth);
  if (trustProxyDepth > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyDepth);
  }

  // Health and all routes live under /api (e.g. /api/health/live, /api/health/ready). Smoke uses these paths.
  if (debugBoot) console.log('🔧 Setting global prefix...');
  app.setGlobalPrefix('api');

  // Enterprise Foundation: environment header, /api/v1/* alias, and legacy deprecation headers
  app.use(zephixEnvHeader);
  app.use(legacyDeprecationHeaders);
  app.use(v1RewriteMiddleware);

  if (debugBoot) console.log('🛡️ Configuring security middleware...');
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    }),
  );

  if (debugBoot) console.log('🍪 Configuring cookie parser...');
  app.use(cookieParser());

  if (debugBoot) console.log('🌐 Configuring CORS...');
  const isProduction = process.env.NODE_ENV === 'production';
  const isStaging = String(process.env.ZEPHIX_ENV || '').toLowerCase() === 'staging';
  const corsOrigins: string[] = [];
  if (isStaging) {
    corsOrigins.push('https://zephix-frontend-staging.up.railway.app');
  } else {
    corsOrigins.push('https://getzephix.com', 'https://www.getzephix.com');
  }
  if (!isProduction) {
    corsOrigins.push('http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000');
  }
  if (process.env.FRONTEND_URL && !corsOrigins.includes(process.env.FRONTEND_URL)) {
    corsOrigins.push(process.env.FRONTEND_URL);
  }
  const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const origin of extraOrigins) {
    if (!corsOrigins.includes(origin)) corsOrigins.push(origin);
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    exposedHeaders: [...CORS_EXPOSED_HEADERS],
  });

  if (debugBoot) console.log('🆔 Configuring request ID middleware...');
  app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || crypto.randomUUID();
    const cid = req.headers['x-correlation-id'] || rid;
    res.setHeader('X-Request-Id', String(rid));
    res.setHeader('X-Correlation-Id', String(cid));
    // @ts-ignore
    req.id = rid;
    // @ts-ignore
    req.correlationId = cid;
    next();
  });

  if (debugBoot) console.log('✅ Configuring global validation pipe...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        // Build standardized validation error
        const firstError = errors[0];
        const firstMessage = firstError?.constraints
          ? Object.values(firstError.constraints)[0]
          : 'Invalid request';

        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: firstMessage,
          errors, // Keep for detailed extraction in filter
        });
      },
    }),
  );

  // Add global envelope interceptor for standardized responses
  if (debugBoot) console.log('📦 Configuring global envelope interceptor...');
  const interceptors = [new EnvelopeInterceptor()];

  // Conditionally add request context logger
  const requestLoggerEnabled = isTrue(
    process.env.REQUEST_CONTEXT_LOGGER_ENABLED,
  );
  if (debugBoot) {
    console.log(
      `REQUEST_CONTEXT_LOGGER_ENABLED value: ${process.env.REQUEST_CONTEXT_LOGGER_ENABLED}`,
    );
    console.log(
      `REQUEST_CONTEXT_LOGGER_ENABLED parsed: ${requestLoggerEnabled}`,
    );
  }
  if (requestLoggerEnabled) {
    interceptors.unshift(new RequestContextLoggerInterceptor());
    if (debugBoot) console.log('✅ RequestContextLoggerInterceptor enabled');
  } else {
    if (debugBoot) console.log('⚠️  RequestContextLoggerInterceptor disabled');
  }

  app.useGlobalInterceptors(...interceptors);

  if (debugBoot) console.log('🚨 Configuring global exception filter...');
  app.useGlobalFilters(new ApiErrorFilter());

  // DEBUG: list all registered routes (Express)
  // Only log in development to avoid Railway log rate limits
  if (process.env.NODE_ENV !== 'production') {
    const server = app.getHttpServer();
    const router = server._events?.request?._router;
    if (router?.stack) {
      console.log(
        '[ROUTES]',
        router.stack
          .filter((l) => l.route)
          .map((l) => {
            const methods = Object.keys(l.route.methods)
              .filter((m) => l.route.methods[m])
              .join(',');
            return `${methods.toUpperCase()} ${l.route.path}`;
          }),
      );
    }
  }

  const port = Number(process.env.PORT) || 3000;
  console.log('BOOT_BEFORE_LISTEN', { port });
  if (debugBoot) console.log('🚀 Starting server on port:', port);
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for Railway
  console.log('BOOT_LISTENING', { port });
  console.log(`BOOT_READY port=${port}`);

  if (debugBoot) {
    console.log('✅ Application is running on:', `http://localhost:${port}`);
    console.log(
      '✅ API endpoints available at:',
      `http://localhost:${port}/api`,
    );
  }

  // Post-startup router verification (Express only)
  // Only log in development to avoid Railway log rate limits
  if (process.env.NODE_ENV !== 'production') {
    const httpServer = app.getHttpServer();
    if (
      httpServer &&
      typeof httpServer._router !== 'undefined' &&
      httpServer._router?.stack
    ) {
      const routes = httpServer._router.stack.filter((layer) => layer.route);
      console.log(
        `🎯 Router verification: ${routes.length} routes registered in Express stack`,
      );
    }
  }
  // Skip router check for Fastify or other adapters
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

// Monitor memory usage to prevent Railway container kills (log only when DEBUG_BOOT or high)
setInterval(() => {
  const used = process.memoryUsage();
  const rssMB = Math.round(used.rss / 1024 / 1024);
  const heapMB = Math.round(used.heapUsed / 1024 / 1024);
  const externalMB = Math.round(used.external / 1024 / 1024);
  const debugBootEnv = process.env.DEBUG_BOOT === 'true';

  if (debugBootEnv) {
    console.log(
      `📊 Memory Usage - RSS: ${rssMB}MB, Heap: ${heapMB}MB, External: ${externalMB}MB`,
    );
  }
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

// Log Railway environment information (only when DEBUG_BOOT)
if (process.env.DEBUG_BOOT === 'true') {
  console.log('🚂 Railway Environment Info:');
  console.log(`   PORT: ${process.env.PORT || 'Not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`   SKIP_DATABASE: ${process.env.SKIP_DATABASE || 'Not set'}`);
  console.log(
    `   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`,
  );
  console.log(
    `   Memory Limit: ${process.env.RAILWAY_MEMORY_LIMIT || 'Not set'}`,
  );
  console.log(`   CPU Limit: ${process.env.RAILWAY_CPU_LIMIT || 'Not set'}`);
}

// Log commit SHA for deployment verification
import { logCommitSha } from './common/utils/commit-sha.resolver';
const bootstrapLogger = new Logger('Bootstrap');
logCommitSha(bootstrapLogger);
