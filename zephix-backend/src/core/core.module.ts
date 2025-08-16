import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService, sslConfigService: SslConfigService) => {
          const databaseUrl = configService.get<string>('DATABASE_URL');
          
          if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is required');
          }

          // Use SslConfigService instead of duplicate logic
          const sslConfig = sslConfigService.getSslConfig();
          
          console.log('🔐 SSL Configuration from SslConfigService:', {
            sslConfig,
            databaseUrl: databaseUrl.substring(0, 50) + '...',
            hasSslMode: databaseUrl.includes('sslmode=')
          });
          
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: false,
            ssl: sslConfig,
            extra: {
              max: 10,
              connectionTimeoutMillis: 30000,
              acquireTimeoutMillis: 30000,
            },
            retryAttempts: 10,
            retryDelay: 3000,
          };
        },
        inject: [ConfigService, SslConfigService],
      })
    ] : []),
  ],
  providers: [
    SslConfigService, // Ensure this is included
    DatabaseService,
    HealthService,
  ],
  exports: [
    SslConfigService, // Export for global availability
    DatabaseService, 
    HealthService,
  ],
})
export class CoreModule {}
