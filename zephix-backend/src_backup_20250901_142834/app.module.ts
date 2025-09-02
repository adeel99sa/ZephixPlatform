import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';

import configuration from './config/configuration';
import { SharedModule } from './shared/shared.module';
import { WorkItemModule } from './modules/work-items/work-item.module';
import { TemplateModule } from './modules/templates/template.module';
import { ObservabilityModule } from './observability/observability.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RiskManagementModule } from './pm/risk-management/risk-management.module';
import { ResourceModule } from './modules/resources/resource.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { getDatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PortfoliosModule } from './modules/portfolios/portfolios.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

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
        name: 'short',
        ttl: 60000,
        limit: process.env.NODE_ENV === 'development' ? 1000 : 100,
      },
    ]),

    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
              const dbConfig = getDatabaseConfig();
              return {
                ...dbConfig,
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false,
              };
            },
            inject: [ConfigService],
          }),
        ]
      : []),

    // Core modules
    SharedModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,

    // Feature modules
    ProjectsModule,
    ResourceModule,
    HealthModule,
    DashboardModule,
    RiskManagementModule,
    WorkItemModule,
    TemplateModule,
    ObservabilityModule,
    WaitlistModule,
    PortfoliosModule,
    ProgramsModule,
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
        transformOptions: { enableImplicitConversion: true },
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
    console.log(
      '✅ Modules loaded: Auth, Projects, Resources, Users, Organizations',
    );
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
