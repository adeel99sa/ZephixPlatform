// src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TypeOrmModule,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';
import * as crypto from 'crypto';

import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Patch global.crypto for Node.js & TypeORM
if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto || crypto;
}

// Force IPv4 DNS resolution (avoids FD12 timeout)
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService): TypeOrmModuleOptions => {
        const url = cs.get<string>('database.url') || process.env.DATABASE_URL!;
        const isProd = cs.get<string>('nodeEnv') === 'production';

        const common: Partial<TypeOrmModuleOptions> = {
          type: 'postgres',
          url,
          entities: [User, Feedback],
          synchronize: true,          // auto-create tables
          autoLoadEntities: true,
          ssl: { rejectUnauthorized: false },
          retryAttempts: 10,
          retryDelay: 3000,
          keepConnectionAlive: true,
          logging: isProd ? ['error', 'warn'] : true,
        };

        // Pool + IPv4 + timeouts
        common.extra = {
          max: 10,
          min: 2,
          idle: 10000,
          acquireTimeoutMillis: 60000,
          keepAlive: true,
          family: 4,                  // force IPv4
        };

        return common as TypeOrmModuleOptions;
      },
      inject: [ConfigService],
    }),
    AuthModule,
    FeedbackModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: ValidationPipe },
  ],
})
export class AppModule {}
