import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from '../config/env.validation';
import { DatabaseService } from './services/database.service';
import { HealthService } from './services/health.service';


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
        useFactory: () => {
          const useUrl = !!process.env.DATABASE_URL;
          
          // CRITICAL: When using DATABASE_URL, we must handle SSL differently
          // DATABASE_URL with ?sslmode=require overrides our ssl property
          if (useUrl) {
            // Parse DATABASE_URL to check SSL mode
            const url = new URL(process.env.DATABASE_URL!);
            const sslMode = url.searchParams.get('sslmode');
            
            console.log('🔐 DATABASE_URL SSL Analysis:', {
              sslMode,
              fullUrl: process.env.DATABASE_URL,
              hasSslMode: !!sslMode
            });
            
            // If DATABASE_URL has sslmode=require, we need to ensure SSL config is applied
            // TypeORM will use the URL's SSL mode, but we can still set rejectUnauthorized
            const sslConfig = {
              rejectUnauthorized: false, // Always accept self-signed for Railway
            };
            
            console.log('🔐 Final SSL Config for DATABASE_URL:', sslConfig);
            
            return {
              type: 'postgres' as const,
              url: process.env.DATABASE_URL,
              ssl: sslConfig, // This will work with sslmode=require
              synchronize: false,
              migrationsRun: false,
              logging: ['error'],
            };
          } else {
            // Use discrete variables - apply our SSL logic
            const DB_SSL = (process.env.DB_SSL || 'require').toLowerCase();
            const DB_SSL_STRICT = (process.env.DB_SSL_STRICT || 'false').toLowerCase() === 'true';
            
            const decodeMaybeBase64 = (input?: string) => {
              if (!input) return undefined;
              try {
                const decoded = Buffer.from(input, 'base64').toString('utf8');
                if (decoded.includes('-----BEGIN') && decoded.includes('-----END')) {
                  return decoded;
                }
                return input;
              } catch {
                return input;
              }
            };
            
            const DB_SSL_CA = decodeMaybeBase64(process.env.DB_SSL_CA);
            
            const sslConfig =
              DB_SSL === 'disable'
                ? false
                : DB_SSL_STRICT
                ? { rejectUnauthorized: true, ca: DB_SSL_CA }
                : { rejectUnauthorized: false };
            
            console.log('🔐 SSL Config for discrete variables:', sslConfig);
            
            return {
              type: 'postgres' as const,
              host: process.env.DB_HOST,
              port: Number(process.env.DB_PORT || 5432),
              username: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
              ssl: sslConfig,
              synchronize: false,
              migrationsRun: false,
              logging: ['error'],
            };
          }
        },
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
