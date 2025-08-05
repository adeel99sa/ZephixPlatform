import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';

// Import crypto explicitly for Node.js versions that require it
import * as crypto from 'crypto';

import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Patch global crypto to avoid "crypto is not defined" errors in TypeORM utils
if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto || crypto;
}

// CRITICAL: Configure Node.js DNS resolution to prefer IPv4
// This prevents "connect ETIMEDOUT fd12:..." IPv6 timeout errors
process.env.UV_THREADPOOL_SIZE = '64';
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

// Additional IPv4 networking configuration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = process.env.DATABASE_URL;
        const isProduction = process.env.NODE_ENV === 'production';

        if (databaseUrl) {
          // Railway production configuration - FIXED for IPv6 timeout errors
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, Feedback],
            synchronize: configService.get('database.synchronize'),
            logging: isProduction ? ['error', 'warn'] : configService.get('database.logging'),
            ssl: {
              rejectUnauthorized: false,
            },
            extra: {
              // Connection pool settings optimized for Railway
              max: 10,                    // Standard pool size
              min: 2,                     // Minimum connections
              acquire: 60000,             // 1min acquire timeout
              idle: 10000,               // 10s idle timeout
              
              // CRITICAL FIX: Force IPv4 connections to prevent IPv6 timeouts
              family: 4,                  // Force IPv4 - prevents "connect ETIMEDOUT fd12:..." errors
              
              // Connection timeout settings optimized for Railway
              connectTimeoutMS: 60000,    // 1min connection timeout
              acquireTimeoutMillis: 60000, // 1min acquire timeout
              timeout: 60000,            // 1min query timeout
              
              // Keep connection alive settings
              keepConnectionAlive: true,
              keepAlive: true,
              keepAliveInitialDelayMillis: 10000,
              
              // SSL settings for Railway
              ssl: {
                rejectUnauthorized: false,
                ca: undefined,
                key: undefined,
                cert: undefined,
              },
            },
            
            // Retry configuration to handle connection issues
            retryAttempts: 15,           // 15 retry attempts for Railway stability
            retryDelay: 5000,            // 5s delay between retries
            retryAttemptsTimeout: 300000, // 5min total retry timeout
            
            // Connection validation
            keepConnectionAlive: true,
            autoLoadEntities: true,
            
            // Query optimization
            maxQueryExecutionTime: 30000, // 30s max query time
            
            // Migration settings
            migrationsRun: false,
            migrations: [],
            
            // Logging for debugging
            logger: isProduction ? 'simple-console' : 'advanced-console',
          };
        } else {
          // Local development configuration
          return {
            type: 'postgres',
            host: configService.get('database.host'),
            port: configService.get('database.port'),
            username: configService.get('database.username'),
            password: configService.get('database.password'),
            database: configService.get('database.database'),
            entities: [User, Feedback],
            synchronize: configService.get('database.synchronize'),
            logging: configService.get('database.logging'),
            extra: {
              max: 10,
              min: 2,
              acquire: 30000,
              idle: 10000,
              family: 4, // Force IPv4 for local development too
            },
            retryAttempts: 5,
            retryDelay: 3000,
            keepConnectionAlive: true,
          };
        }
      },
      inject: [ConfigService],
    }),
    AuthModule,
    FeedbackModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}