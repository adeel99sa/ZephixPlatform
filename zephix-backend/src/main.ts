import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto'; // Proper import of crypto

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

    // Configure CORS before Helmet and route setup
    const allowed = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    app.enableCors({
      origin: allowed.length > 0 ? allowed : true,
      credentials: true,
      methods: 'GET,HEAD,POST,PUT,PATCH,DELETE',
      allowedHeaders: 'Authorization,Content-Type',
      optionsSuccessStatus: 204
    });

    // Trust proxy for rate limiting and IP detection
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

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
