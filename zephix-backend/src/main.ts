import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import 'crypto';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Enable CORS (customize origins for production)
    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production'
          ? [
              'https://getzephix.com',
              'https://zephix-frontend-production-2c3ec553.up.railway.app',
            ]
          : true,
      credentials: true,
    });

    // Global Validation Pipe (optional, but recommended)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Set global API prefix
    app.setGlobalPrefix('api');

    // Listen on process.env.PORT (required by Railway!)
    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Zephix Authentication Service running on port ${port}`);
    logger.log(
      `📊 Health check available at: http://localhost:${port}/api/health`,
    );

    // Graceful shutdown
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
