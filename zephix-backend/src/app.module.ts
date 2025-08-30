// src/app.module.ts - CORRECTED IMPORT PATHS
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
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { ResourcesModule } from './resources/resources.module';
import { SharedModule } from './shared/shared.module';
import { DiagnosticModule } from './projects/diagnostic.module';
import { WorkItemModule } from './modules/work-items/work-item.module';
import { TemplateModule } from './modules/templates/template.module';
import { ObservabilityModule } from './observability/observability.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RiskManagementModule } from './pm/risk-management/risk-management.module';
import { ResourceModule } from './modules/resources/resource.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

import {
  getDatabaseConfig,
  validateDatabasePrivileges,
} from './config/database.config';

// Import existing entities - CORRECTED PATHS
import { User } from './modules/users/entities/user.entity';
import { Organization } from './organizations/entities/organization.entity';
import { UserOrganization } from './organizations/entities/user-organization.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './projects/entities/team.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { EmailVerification } from './auth/entities/email-verification.entity';
import { Waitlist } from './waitlist/entities/waitlist.entity';

// CORRECTED PATHS for settings entities
import { UserSettings } from './modules/users/entities/user-settings.entity';
import { OrganizationSettings } from './organizations/entities/organization-settings.entity';
import { SecuritySettings } from './organizations/entities/security-settings.entity';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Patch global crypto to avoid "crypto is not defined" errors in TypeORM utils
if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto || crypto;
}

@Module({
  imports: [
    // Core configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),

    // JWT module configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '15m',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),

    // Rate limiting for security
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: process.env.NODE_ENV === 'development' ? 1000 : 100,
      },
    ]),

    // Database configuration - BETTER SOLUTION: AUTO-DISCOVERY
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
              const dbConfig = getDatabaseConfig();
              
              return {
                ...dbConfig,
                // AUTO-DISCOVERY: Find all entities automatically
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false, // Never use synchronize in production
              };
            },
            inject: [ConfigService],
          }),
        ]
      : []),

    // Core modules
    SharedModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    ResourcesModule,
    DiagnosticModule,
    HealthModule,
    DashboardModule,
    RiskManagementModule,
    ResourceModule,
    WorkItemModule,
    TemplateModule,
    ObservabilityModule,
    WaitlistModule, // CRITICAL: This enables your waitlist endpoint
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  constructor() {
    console.log('🚀 AppModule initialized');
    console.log('📦 Modules loaded:', {
      auth: !!AuthModule,
      waitlist: !!WaitlistModule,
      database: process.env.SKIP_DATABASE !== 'true',
    });

    if (process.env.SKIP_DATABASE === 'true') {
      console.log('⚠️ Database-dependent modules disabled');
    } else {
      console.log('✅ All modules enabled including database');
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}