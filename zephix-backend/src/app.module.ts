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
import { ProjectsModule } from './projects/projects.module';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './projects/entities/team.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Patch global.crypto so TypeORM's randomUUID() works
if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto || crypto;
}

// Force IPv4-first DNS resolution (avoids fd12 timeouts)
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
        const url =
          cs.get<string>('database.url') || process.env.DATABASE_URL!;
        const isProd = cs.get<string>('nodeEnv') === 'production';

        return {
          type: 'postgres',
          url,
          entities: [User, Feedback, Project, Team, TeamMember, Role],
          synchronize: true,               // auto-create tables
          autoLoadEntities: true,
          ssl: { rejectUnauthorized: false },

          // retry strategy
          retryAttempts: 10,
          retryDelay: 3000,

          // logging
          logging: isProd ? ['error', 'warn'] : true,

          // connection pool + IPv4 (CRITICAL FIX for Railway)
          extra: {
            max: 10,
            min: 2,
            idleTimeoutMillis: 10000,
            acquireTimeoutMillis: 60000,
            keepAlive: true,
            family: 4,                     // force IPv4 - prevents IPv6 timeout errors
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    FeedbackModule,
    ProjectsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: ValidationPipe },
  ],
})
export class AppModule {}