import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as crypto from 'crypto'; // Proper import of crypto

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Enable CORS - customize origins for production only
    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production'
          ? [
              'https://getzephix.com',
              'https://zephix-frontend-production.up.railway.app',
              process.env.RAILWAY_SERVICE_ZEPHIX_FRONTEND_URL,
            ].filter(Boolean) // Remove undefined values
          : true,
      credentials: true,
    });

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
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await app.listen(port);

    logger.log(`🚀 Zephix Authentication Service running on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/api/health`);

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
