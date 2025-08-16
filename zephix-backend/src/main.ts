// CRITICAL: Must be first line in main.ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Initialize OpenTelemetry before importing anything else
import './telemetry';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { EnvironmentVariables } from './config/env.validation';
import { HealthService } from './core/services/health.service';
import { ServiceStatus } from './core/interfaces/base.service';

// Enterprise bootstrap function with proper service verification
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting enterprise application bootstrap...');
    
    // Phase 1: Core Services
    logger.log('📋 Phase 1: Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      bufferLogs: true
    });
    logger.log('✅ NestJS application created successfully');

    // Phase 2: Essential Services Check
    logger.log('🔍 Phase 2: Verifying essential services...');
    const configService = app.get(ConfigService<EnvironmentVariables>);
    const healthService = app.get(HealthService);
    
    // Simple SSL Configuration Check
    console.log('🔒 SSL Configuration: NODE_TLS_REJECT_UNAUTHORIZED =', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
    console.log('📋 Database URL configured:', !!process.env.DATABASE_URL);
    
    // Verify core services before proceeding
    const coreHealth = await healthService.checkCoreServices();
    if (coreHealth.status === ServiceStatus.UNAVAILABLE) {
      throw new Error(`Core services unavailable: ${coreHealth.message}`);
    }
    logger.log('✅ Core services verified successfully');

    // Phase 3: Optional Services (Non-blocking)
    logger.log('⚡ Phase 3: Initializing optional services...');
    healthService.initializeOptionalServices(); // Fire and forget
    logger.log('✅ Optional services initialization started');

    // Phase 4: HTTP Server Configuration
    logger.log('🌐 Phase 4: Configuring HTTP server...');
    
    // CORS configuration
    const corsConfig = {
      origin: [
        'https://getzephix.com',
        'https://www.getzephix.com', 
        'https://app.getzephix.com',
        // Fallback for development
        configService.get('FRONTEND_URL') || 'https://zephix-frontend-production.up.railway.app'
      ].filter(Boolean), // Remove any undefined values
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With',
        'X-Org-Id', 'X-Request-Id', 'X-CSRF-Token', 'X-Forwarded-For', 'X-Real-IP',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset',
        'X-Request-Id', 'X-Total-Count', 'X-Page-Count',
      ],
      optionsSuccessStatus: 204,
      maxAge: 86400,
      preflightContinue: false,
    };
    
    app.enableCors(corsConfig);
    logger.log('✅ CORS configuration applied');

    // Security middleware
    app.use(helmet());
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    }));
    logger.log('✅ Security middleware configured');

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    logger.log('✅ Global validation pipe configured');

    // Phase 5: HTTP Server Startup
    logger.log('🔌 Phase 5: Starting HTTP server...');
    const port = Number(process.env.PORT || 3000); // Ensure proper port binding
    logger.log(`Binding to port: ${port}`);
    
    const server = await app.listen(port, '0.0.0.0');
    
    if (server.listening) {
      logger.log(`✅ Server successfully bound to port ${port}`);
      logger.log(`🌐 Server address: ${server.address()}`);
    } else {
      throw new Error(`Server binding failed on port ${port}`);
    }

    // Phase 6: Post-startup health verification
    logger.log('🏥 Phase 6: Post-startup health verification...');
    setTimeout(async () => {
      try {
        const fullHealth = await healthService.getFullHealth();
        logger.log('Startup health check completed:', {
          status: fullHealth.status,
          services: Object.keys(fullHealth.services),
          uptime: `${Math.round(fullHealth.uptime / 1000)}s`
        });
      } catch (error) {
        logger.error('Post-startup health check failed:', error.message);
      }
    }, 5000);

    logger.log('🎉 Enterprise application bootstrap completed successfully');
    
  } catch (error) {
    logger.error('❌ Bootstrap failed:', error.message);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the application
bootstrap();
