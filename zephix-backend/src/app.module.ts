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
// import featureFlagsConfig from './config/feature-flags.config';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { ResourcesModule } from './resources/resources.module';
import { SharedModule } from './shared/shared.module';
import { DiagnosticModule } from './projects/diagnostic.module';
import { WorkItemModule } from './modules/work-items/work-item.module';
import { TemplateModule } from './modules/templates/template.module';
// import { AIModule } from './ai/ai.module';
// import { PMModule } from './pm/pm.module';
// import { BRDModule } from './brd/brd.module';
// import { ArchitectureModule } from './architecture/architecture.module';
// import { IntelligenceModule } from './intelligence/intelligence.module';
import { ObservabilityModule } from './observability/observability.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RiskManagementModule } from './pm/risk-management/risk-management.module';
import { ResourceModule } from './modules/resources/resource.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

// Import middleware - DISABLED
// import { RequestIdMiddleware } from './observability/request-id.middleware';
// import { MetricsMiddleware } from './observability/metrics.middleware';
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
    // Core configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
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
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: process.env.NODE_ENV === 'development' ? 1000 : 100,
      },
    ]),

    // EMERGENCY MODE: Conditionally import TypeORM and database-dependent modules
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async () => {
              // Use the new centralized database configuration
              const dbConfig = getDatabaseConfig();

              // Database configuration simplified - no additional validation needed

              return dbConfig;
            },
            inject: [ConfigService],
          }),
        ]
      : []),

    // Core modules (always enabled)
    SharedModule, // First - no dependencies
    AuthModule, // Always import AuthModule for authentication
    OrganizationsModule, // Third - depends on SharedModule
    ProjectsModule, // Fourth - depends on SharedModule
    ResourcesModule, // ADDED: Resource conflict prevention system
    DiagnosticModule, // Diagnostic module for testing
    HealthModule, // Health checks
    DashboardModule, // Dashboard module
    RiskManagementModule, // Risk Management Module
    ResourceModule, // Resource Module
    WorkItemModule, // Work Item Module
    TemplateModule, // Template Module
    
    // Conditional modules based on feature flags - DISABLED
    // ...(process.env.ENABLE_AI_MODULE === 'true' ? [AIModule] : []),
    // ...(process.env.ENABLE_GOVERNANCE === 'true' ? [ArchitectureModule] : []), // ArchitectureModule as governance
    // ...(process.env.ENABLE_DOCUMENTS === 'true' ? [BRDModule] : []),
    ObservabilityModule, // Always enable for MetricsService dependency
    // ...(process.env.ENABLE_WORKFLOWS === 'true' ? [PMModule] : []), // PM has document dependencies
    // ...(process.env.ENABLE_AI_MODULE === 'true' ? [IntelligenceModule] : []), // Intelligence depends on AI
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
    // Apply tenant middleware for all routes
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}