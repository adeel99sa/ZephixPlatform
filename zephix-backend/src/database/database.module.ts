import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import type { LoggerOptions } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        const isProd = process.env.NODE_ENV === 'production';
        const databaseUrl = process.env.DATABASE_URL as string;
        const logging: boolean | LoggerOptions = isProd
          ? (['error', 'warn'] as LoggerOptions)
          : true;

        // CRITICAL SECURITY: SSL configuration for Railway PostgreSQL
        // Note: This module is not used in the main app - SSL is configured in app.module.ts
        const sslConfig = isProd
          ? {
              rejectUnauthorized: true, // CRITICAL: Never disable SSL validation
            }
          : false;

        console.log(
          '🔐 Database SSL Configuration:',
          isProd ? 'Production SSL Enabled' : 'Development - No SSL',
        );

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          logging,
          ssl: sslConfig,
          migrationsTransactionMode: 'each',
          migrations: [__dirname + '/migrations/*.{ts,js}'],
          extra: {
            max: 10,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 60000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
            // Enterprise connection pool settings
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
