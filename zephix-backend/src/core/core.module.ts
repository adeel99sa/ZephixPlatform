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

          // mirror the same SSL logic used in data-source.ts
          const DB_SSL = (process.env.DB_SSL || 'require').toLowerCase(); // disable | require
          const DB_SSL_STRICT = (process.env.DB_SSL_STRICT || 'false').toLowerCase() === 'true';

          const decodeMaybeBase64 = (input?: string) => {
            if (!input) return undefined;
            try {
              const out = Buffer.from(input, 'base64').toString('utf8');
              if (out.includes('-----BEGIN') && out.includes('-----END')) return out;
              return input;
            } catch {
              return input;
            }
          };

          const DB_SSL_CA = decodeMaybeBase64(process.env.DB_SSL_CA);

          const ssl =
            DB_SSL === 'disable'
              ? false
              : DB_SSL_STRICT
              ? { rejectUnauthorized: true, ca: DB_SSL_CA }
              : { rejectUnauthorized: false };

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
            ssl,
            autoLoadEntities: true,   // Nest will discover your entities
            synchronize: false,
            migrationsRun: false,
            logging: ['error'],
          };
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
