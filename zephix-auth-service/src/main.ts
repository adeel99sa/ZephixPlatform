import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import 'crypto';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    // Enable CORS for production
    app.enableCors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://getzephix.com', 'https://zephix-frontend-production-2c3ec553.up.railway.app']
        : true,
      credentials: true,
    });
    
    // API prefix
    app.setGlobalPrefix('api');
    
    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`🚀 Zephix Authentication Service running on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/api/health`);
    
    // Graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.log(`Received ${signal}, starting graceful shutdown...`);
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
