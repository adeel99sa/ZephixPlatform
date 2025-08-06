import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';

// Import crypto explicitly for Node.js versions that require it
import * as crypto from 'crypto';

import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './projects/entities/team.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Patch global crypto to avoid "crypto is not defined" errors in TypeORM utils
if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto || crypto;
}

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
          // Railway production configuration - optimized for platform
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, Feedback, Project, Team, TeamMember, Role],
            synchronize: configService.get('database.synchronize'),
            logging: isProduction
              ? ['error', 'warn']
              : configService.get('database.logging'),
            ssl: {
              rejectUnauthorized: false,
            },
            extra: {
              max: 10, // Reduced pool size for Railway limits
              min: 2,
              acquire: 60000, // 60s acquire timeout for Railway delays
              idle: 10000,
              family: 4, // Force IPv4 - CRITICAL for Railway networking
            },
            retryAttempts: 15, // More retries for Railway platform stability
            retryDelay: 5000, // 5s delay between retries
            connectTimeoutMS: 60000, // 60s connection timeout
            acquireTimeoutMillis: 60000, // 60s acquire timeout
            keepConnectionAlive: true,
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
            entities: [User, Feedback, Project, Team, TeamMember, Role],
            synchronize: configService.get('database.synchronize'),
            logging: configService.get('database.logging'),
            extra: {
              max: 10,
              min: 2,
              acquire: 30000,
              idle: 10000,
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
    ProjectsModule,
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
