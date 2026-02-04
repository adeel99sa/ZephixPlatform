import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { CsrfGuard } from './modules/auth/guards/csrf.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import * as crypto from 'crypto';

import configuration from './config/configuration';
// import { AuthModule } from './auth/auth.module';
// import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
// import { ResourcesModule } from './resources/resources.module';
import { SharedModule } from './shared/shared.module';
// import { DiagnosticModule } from './projects/diagnostic.module';
import { WorkItemModule } from './modules/work-items/work-item.module';
import { TemplateModule } from './modules/templates/template.module';
import { ObservabilityModule } from './observability/observability.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RiskManagementModule } from './pm/risk-management/risk-management.module';
import { ResourceModule } from './modules/resources/resource.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TaskTrafficCounterMiddleware } from './middleware/task-traffic-counter.middleware';
import { databaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PortfoliosModule } from './modules/portfolios/portfolios.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { KPIModule } from './modules/kpi/kpi.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { WorkspaceAccessModule } from './modules/workspace-access/workspace-access.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { RisksModule } from './modules/risks/risks.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WorkManagementModule } from './modules/work-management/work-management.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HomeModule } from './modules/home/home.module';
import { DemoModule } from './bootstrap/demo.module';
import { BillingModule } from './billing/billing.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AdminModule } from './admin/admin.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { TenantContextInterceptor } from './modules/tenancy/tenant-context.interceptor';
import { DocsModule } from './modules/docs/docs.module';
import { FormsModule } from './modules/forms/forms.module';
import { TemplateCenterModule } from './modules/template-center/template-center.module';
import { DatabaseModule } from './modules/database/database.module';
import { bootLog } from './common/utils/debug-boot';

if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto || crypto;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),

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

    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds in milliseconds
        limit: 100, // CHANGE FROM 10 TO 100 requests per minute
      },
    ]),

    ScheduleModule.forRoot(), // Required for @Cron decorators (e.g., OutboxProcessorService)

    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forRoot(databaseConfig), DatabaseModule]
      : []),

    SharedModule,
    TenancyModule, // Must be imported early for global tenant context
    WorkspaceAccessModule, // Must be imported early - provides WorkspaceAccessService used by many modules
    AuthModule,
    OrganizationsModule,
    BillingModule,
    AdminModule,
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          ProjectsModule,
          UsersModule,
          // ResourcesModule,
          // DiagnosticModule,
          HealthModule,
          DashboardModule,
          RiskManagementModule,
          ResourceModule,
          WorkItemModule,
          TemplateModule,
          ObservabilityModule,
          WaitlistModule,
          PortfoliosModule,
          ProgramsModule, // PHASE 6: Workspace-scoped programs
          DashboardsModule,
          TasksModule,
          KPIModule,
          WorkspacesModule,
          RisksModule,
          CustomFieldsModule,
          IntegrationsModule,
          WorkManagementModule,
          NotificationsModule,
          HomeModule,
          DocsModule,
          FormsModule,
          TemplateCenterModule,
        ]
      : [
          HealthModule, // Keep health module for basic health checks
        ]),

    DemoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register TenantContextInterceptor globally
    // It runs after auth guards to access req.user.organizationId
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    // {
    //   provide: APP_PIPE,
    //   useValue: new ValidationPipe({
    //     whitelist: true,
    //     forbidNonWhitelisted: true,
    //     transform: true,
    //     transformOptions: { enableImplicitConversion: true },
    //   }),
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule implements NestModule {
  constructor() {
    bootLog('AppModule initialized');
  }

  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(TenantMiddleware).forRoutes('*'); // Temporarily disabled for debugging
    consumer.apply(TaskTrafficCounterMiddleware).forRoutes('*');
  }
}
