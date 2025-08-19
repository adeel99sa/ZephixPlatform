import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';

// Import crypto explicitly for Node.js versions that require it
import * as crypto from 'crypto';

import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { SharedModule } from './shared/shared.module';
import { AIModule } from './ai/ai.module';
import { PMModule } from './pm/pm.module';
import { BRDModule } from './brd/brd.module';
import { ArchitectureModule } from './architecture/architecture.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ObservabilityModule } from './observability/observability.module';
import { HealthModule } from './health/health.module';

// Import middleware
import { RequestIdMiddleware } from './observability/request-id.middleware';
import { MetricsMiddleware } from './observability/metrics.middleware';
import {
  getDatabaseConfig,
  validateDatabasePrivileges,
} from './config/database.config';

// Import ONLY essential entities for authentication
import { User } from './modules/users/entities/user.entity';
import { Organization } from './organizations/entities/organization.entity';
import { UserOrganization } from './organizations/entities/user-organization.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './projects/entities/team.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { EmailVerification } from './auth/entities/email-verification.entity'; // CRITICAL FIX: Add missing import

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
      // CRITICAL FIX: Prevent local .env files from overriding Railway environment variables
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? []
          : ['.env', '.env.local', '.env.development'],
      validationSchema,
    }),

    // ENTERPRISE APPROACH: Make JWT module truly global to avoid circular dependencies
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '15m',
        },
      }),
      inject: [ConfigService],
      global: true, // Make JWT available globally
    }),

    // Rate limiting for security
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 5
    }]),

    // EMERGENCY MODE: Conditionally import TypeORM and database-dependent modules
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
              // Use the new centralized database configuration
              const dbConfig = getDatabaseConfig(configService);

              // CRITICAL: Validate database user privileges for local development
              if (configService.get('environment') === 'development') {
                try {
                  await validateDatabasePrivileges(configService);
                } catch (error) {
                  console.error(
                    '❌ Database privilege validation failed:',
                    error,
                  );
                  console.error(
                    '❌ Please ensure zephix_user has proper privileges',
                  );
                  throw error;
                }
              }

              return dbConfig;
            },
            inject: [ConfigService],
          }),
        ]
      : []),

    // CRITICAL: Import order to avoid circular dependencies
    SharedModule, // First - no dependencies
    AuthModule, // Always import AuthModule for authentication
    AIModule, // AI services and document processing (conditional TypeORM)
    IntelligenceModule, // Intelligence services (no TypeORM)
    ArchitectureModule, // Architecture services (no TypeORM)

    // EMERGENCY MODE: Only import database-dependent modules when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          OrganizationsModule, // Third - depends on SharedModule
          ProjectsModule, // Fourth - depends on OrganizationsModule
          PMModule, // Project management functionality (conditional TypeORM)
          BRDModule, // Business requirements documentation (conditional TypeORM)
          FeedbackModule, // User feedback system (conditional TypeORM)
        ]
      : []),

    ObservabilityModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
})
export class AppModule {
  constructor() {
    console.log('🚀 AppModule constructor called');
    console.log('🔐 AuthModule imported:', !!AuthModule);
    console.log(
      '🔐 AuthModule controllers:',
      AuthModule ? 'Available' : 'Missing',
    );

    // EMERGENCY MODE: Log current configuration
    if (process.env.SKIP_DATABASE === 'true') {
      console.log('🚨 EMERGENCY MODE: Database-dependent modules disabled');
      console.log(
        '🚨 Available modules: SharedModule, AuthModule, AIModule, IntelligenceModule, ArchitectureModule, ObservabilityModule, HealthModule',
      );
    } else {
      console.log(
        '✅ Full mode: All modules enabled including database-dependent ones',
      );
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
