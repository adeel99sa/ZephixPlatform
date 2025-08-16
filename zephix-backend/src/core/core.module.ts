import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from '../config/env.validation';
import { DatabaseService } from './services/database.service';
import { HealthService } from './services/health.service';
import { dataSourceOptions } from '../data-source';

/**
 * CoreModule - Enterprise Foundation Layer
 * 
 * Provides all essential services globally with proper configuration validation
 * and service health monitoring. This module is the foundation for all other
 * modules and ensures proper service boundaries and dependency management.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      validationOptions: { 
        allowUnknown: true, // Allow Railway to inject unknown env vars
        abortEarly: false // Show all validation errors at once
      }
    }),
    // Only import TypeORM when database is enabled
    ...(process.env.DATABASE_URL && process.env.SKIP_DATABASE !== 'true' ? [
      TypeOrmModule.forRootAsync({
        useFactory: () => dataSourceOptions,
      })
    ] : []),
  ],
  providers: [
    DatabaseService,
    HealthService,
  ],
  exports: [
    DatabaseService, 
    HealthService,
  ],
})
export class CoreModule {}
