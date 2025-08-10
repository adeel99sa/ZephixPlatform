import { Module, ValidationPipe, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';

// Import crypto explicitly for Node.js versions that require it
import * as crypto from 'crypto';

import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PMModule } from './pm/pm.module';
import { SharedModule } from './shared/shared.module';
import { ObservabilityModule } from './observability/observability.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { ArchitectureModule } from './architecture/architecture.module';
import { BRDModule } from './brd/brd.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { HealthController } from './health/health.controller';

// Import middleware
import { RequestIdMiddleware } from './observability/request-id.middleware';
import { MetricsMiddleware } from './observability/metrics.middleware';
import { User } from './users/entities/user.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './projects/entities/team.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { PMKnowledgeChunk } from './pm/entities/pm-knowledge-chunk.entity';
import { UserProject } from './pm/entities/user-project.entity';
import { ProjectTask } from './pm/entities/project-task.entity';
import { ProjectRisk } from './pm/entities/project-risk.entity';
import { ProjectStakeholder } from './pm/entities/project-stakeholder.entity';
import { Portfolio } from './pm/entities/portfolio.entity';
import { Program } from './pm/entities/program.entity';
import { StatusReport } from './pm/entities/status-report.entity';
import { ProjectMetrics } from './pm/entities/project-metrics.entity';
import { PerformanceBaseline } from './pm/entities/performance-baseline.entity';
import { AlertConfiguration } from './pm/entities/alert-configuration.entity';
import { ManualUpdate } from './pm/entities/manual-update.entity';
import { StakeholderCommunication } from './pm/entities/stakeholder-communication.entity';
import { Risk } from './pm/entities/risk.entity';
import { RiskAssessment } from './pm/entities/risk-assessment.entity';
import { RiskResponse } from './pm/entities/risk-response.entity';
import { RiskMonitoring } from './pm/entities/risk-monitoring.entity';
import { BRD } from './brd/entities/brd.entity';
import { BRDAnalysis } from './brd/entities/brd-analysis.entity';
import { GeneratedProjectPlan } from './brd/entities/generated-project-plan.entity';
import { Organization } from './organizations/entities/organization.entity';
import { UserOrganization } from './organizations/entities/user-organization.entity';
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
            entities: [User, Feedback, Project, Team, TeamMember, Role, PMKnowledgeChunk, UserProject, ProjectTask, ProjectRisk, ProjectStakeholder, Portfolio, Program, StatusReport, ProjectMetrics, PerformanceBaseline, AlertConfiguration, ManualUpdate, StakeholderCommunication, Risk, RiskAssessment, RiskResponse, RiskMonitoring, BRD, BRDAnalysis, GeneratedProjectPlan, Organization, UserOrganization],
            migrations: [__dirname + '/**/migrations/*{.ts,.js}'],
            synchronize: false, // Never use synchronize in production
            migrationsRun: true, // Auto-run migrations on startup
            logging: isProduction
              ? ['error', 'warn']
              : configService.get('database.logging'),
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            extra: {
              max: 10, // Connection pool size for Railway limits
              min: 2,
              acquire: 60000, // 60s acquire timeout for Railway delays
              idle: 10000,
              family: 4, // Force IPv4 - CRITICAL for Railway networking
              connectionLimit: 10,
              acquireTimeout: 60000,
              timeout: 60000,
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
            entities: [User, Feedback, Project, Team, TeamMember, Role, PMKnowledgeChunk, UserProject, ProjectTask, ProjectRisk, ProjectStakeholder, Portfolio, Program, StatusReport, ProjectMetrics, PerformanceBaseline, AlertConfiguration, ManualUpdate, StakeholderCommunication, Risk, RiskAssessment, RiskResponse, RiskMonitoring, BRD, BRDAnalysis, GeneratedProjectPlan, Organization, UserOrganization],
            migrations: [__dirname + '/**/migrations/*{.ts,.js}'],
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
    PMModule,
    SharedModule,
    ObservabilityModule,
    IntelligenceModule,
    ArchitectureModule,
    BRDModule,
    OrganizationsModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}
