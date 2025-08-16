import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from '../config/env.validation';
import { DatabaseService } from './services/database.service';
import { HealthService } from './services/health.service';
import { SslConfigService } from './services/ssl-config.service';

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
        useFactory: (sslConfigService: SslConfigService) => {
          const useUrl = !!process.env.DATABASE_URL;
          const sslConfig = sslConfigService.getSslConfig();
          
          // Debug SSL configuration
          console.log('🔐 SSL Configuration:', {
            DB_SSL: process.env.DB_SSL,
            DB_SSL_STRICT: process.env.DB_SSL_STRICT,
            sslConfig,
            hasDatabaseUrl: useUrl,
            databaseUrl: useUrl ? process.env.DATABASE_URL?.substring(0, 50) + '...' : 'N/A'
          });
          
          return {
            type: 'postgres' as const,
            ...(useUrl
              ? { url: process.env.DATABASE_URL }
              : {
                  host: process.env.DB_HOST,
                  port: Number(process.env.DB_PORT || 5432),
                  username: process.env.DB_USER,
                  password: process.env.DB_PASSWORD,
                  database: process.env.DB_NAME,
                }),
            ssl: sslConfig,
            synchronize: false,
            migrationsRun: false,
            logging: ['error'],
          };
        },
        inject: [SslConfigService],
      })
    ] : []),
  ],
  providers: [
    SslConfigService,
    DatabaseService,
    HealthService,
  ],
  exports: [
    DatabaseService, 
    HealthService,
  ],
})
export class CoreModule {}
