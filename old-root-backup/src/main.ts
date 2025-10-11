import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  
  // Security
  app.use(helmet());
  app.use(cookieParser());
  
  // CORS
  app.enableCors({
    origin: configService.get('CORS_ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });
  
  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true,           // Transform to DTO types
    transformOptions: {
      enableImplicitConversion: true,
    },
    validationError: {
      target: false,          // Don't include target in errors
      value: false,           // Don't include value in errors
    },
  }));
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
