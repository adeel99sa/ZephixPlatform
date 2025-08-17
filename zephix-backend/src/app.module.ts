import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

// Import crypto explicitly for Node.js versions that require it
import * as crypto from 'crypto';

import configuration from './config/configuration';
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

// Import ONLY essential entities for authentication
import { User } from "./modules/users/entities/user.entity"
import { Organization } from './organizations/entities/organization.entity';
import { UserOrganization } from './organizations/entities/user-organization.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './projects/entities/team.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';

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

    // EMERGENCY MODE: Conditionally import TypeORM and database-dependent modules
    ...(process.env.SKIP_DATABASE !== 'true' ? [TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = process.env.DATABASE_URL;
        const isProduction = process.env.NODE_ENV === 'production';
        
        // ENTERPRISE SECURITY: SSL Configuration Validation
        const validateSSLConfig = () => {
          if (isProduction && !process.env.DATABASE_CA_CERT) {
            console.warn('⚠️ SECURITY WARNING: Production deployment without custom CA certificate');
            console.warn('⚠️ SSL certificate validation disabled - MITM vulnerability possible');
            console.warn('⚠️ Set DATABASE_CA_CERT environment variable for secure connections');
          }
          
          if (process.env.DATABASE_CA_CERT) {
            console.log('✅ ENTERPRISE SECURITY: Custom CA certificate configured');
            console.log('✅ SSL certificate validation enabled');
          }
        };
        
        // Execute SSL validation
        validateSSLConfig();

        if (databaseUrl) {
          // Railway production configuration - optimized for platform
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [
              User,
              Organization,
              UserOrganization,
              Project,
              Team,
              TeamMember,
              Role,
              RefreshToken,
            ],
            // FIXED: Use explicit migration paths instead of broken pattern
            migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
            synchronize: false, // Never use synchronize in production
            migrationsRun: false, // Migrations controlled manually for safety
            logging: isProduction
              ? ['error', 'warn']
              : configService.get('database.logging'),
            ssl: {
              // ENTERPRISE SECURITY: Validate SSL configuration
              rejectUnauthorized: process.env.DATABASE_CA_CERT ? true : false, // Only accept if CA is provided
              ca: process.env.DATABASE_CA_CERT, // Required for production security
              // Additional security measures
              minVersion: 'TLSv1.2', // Enforce minimum TLS version
              maxVersion: 'TLSv1.3', // Use latest TLS version
            },
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
            migrationsTransactionMode: 'each', // Each migration in its own transaction
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
            entities: [
              User,
              Organization,
              UserOrganization,
              Project,
              Team,
              TeamMember,
              Role,
              RefreshToken,
            ],
            // FIXED: Use explicit migration paths instead of broken pattern
            migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
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
    })] : []),

    // CRITICAL: Import order to avoid circular dependencies
    SharedModule, // First - no dependencies
    AuthModule, // Always import AuthModule for authentication
    AIModule, // AI services and document processing (conditional TypeORM)
    IntelligenceModule, // Intelligence services (no TypeORM)
    ArchitectureModule, // Architecture services (no TypeORM)
    
    // EMERGENCY MODE: Only import database-dependent modules when database is available
    ...(process.env.SKIP_DATABASE !== 'true' ? [
      OrganizationsModule, // Third - depends on SharedModule
      ProjectsModule, // Fourth - depends on OrganizationsModule
      PMModule, // Project management functionality (conditional TypeORM)
      BRDModule, // Business requirements documentation (conditional TypeORM)
      FeedbackModule, // User feedback system (conditional TypeORM)
    ] : []),
    
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
  ],
})
export class AppModule {
  constructor() {
    console.log('🚀 AppModule constructor called');
    console.log('🔐 AuthModule imported:', !!AuthModule);
    console.log('🔐 AuthModule controllers:', AuthModule ? 'Available' : 'Missing');
    
    // EMERGENCY MODE: Log current configuration
    if (process.env.SKIP_DATABASE === 'true') {
      console.log('🚨 EMERGENCY MODE: Database-dependent modules disabled');
      console.log('🚨 Available modules: SharedModule, AuthModule, AIModule, IntelligenceModule, ArchitectureModule, ObservabilityModule, HealthModule');
    } else {
      console.log('✅ Full mode: All modules enabled including database-dependent ones');
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
