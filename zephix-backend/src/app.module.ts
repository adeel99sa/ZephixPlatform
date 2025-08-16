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
import { AuthModule } from './modules/auth/auth.module';
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

    // Gate DatabaseModule behind environment flag for local development
    ...(process.env.SKIP_DATABASE !== 'true' ? [TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = process.env.DATABASE_URL;
        const isProduction = process.env.NODE_ENV === 'production';

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
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
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

    // SYSTEMATIC DEPENDENCY RESOLUTION - Proper order and simplified logic
    // Core modules (no dependencies) - Load first
    SharedModule, // Global module - provides LLMProviderService, ClaudeService, EmailService
    
    // Essential services (depend on core modules)
    ObservabilityModule, // Provides MetricsService
    HealthModule, // Provides health checks
    
    // Authentication (critical for MVP) - depends on core modules
    AuthModule, // Always load - provides authentication endpoints
    
    // Feature modules (depend on core modules)
    AIModule, // AI services - depends on SharedModule (global)
    IntelligenceModule, // Intelligence services - no TypeORM dependencies
    ArchitectureModule, // Architecture services - no TypeORM dependencies
    PMModule, // Project management - depends on SharedModule (global)
    
    // Database-dependent modules (with error handling for connection issues)
    ...(process.env.DATABASE_URL ? (() => {
      try {
        console.log('🔍 Loading database-dependent modules...');
        const databaseModules = [
          OrganizationsModule, // Depends on SharedModule
          ProjectsModule, // Depends on OrganizationsModule
          BRDModule, // Business requirements - depends on SharedModule (global)
          FeedbackModule, // User feedback - depends on SharedModule (global)
        ];
        console.log('✅ Database modules loaded successfully:', databaseModules.map(m => m.name));
        return databaseModules;
      } catch (error) {
        console.error('❌ CRITICAL: Database module loading failed:', error);
        console.error('Stack trace:', error.stack);
        console.warn('⚠️  Continuing without database modules - application will run in limited mode');
        return [];
      }
    })() : []),
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
    try {
      console.log('🚀 AppModule constructor called');
      console.log('🔐 AuthModule imported:', !!AuthModule);
      console.log('🔐 AuthModule controllers:', AuthModule ? 'Available' : 'Missing');
      
      // EMERGENCY: Log all module imports to identify crash point
      console.log('📋 Module Import Status:');
      console.log('   SharedModule:', !!SharedModule);
      console.log('   ObservabilityModule:', !!ObservabilityModule);
      console.log('   HealthModule:', !!HealthModule);
      console.log('   AuthModule:', !!AuthModule);
      console.log('   OrganizationsModule:', !!OrganizationsModule);
      console.log('   ProjectsModule:', !!ProjectsModule);
      
      // Test module instantiation
      console.log('🧪 Testing module instantiation...');
      if (SharedModule) console.log('   ✅ SharedModule instantiated');
      if (ObservabilityModule) console.log('   ✅ ObservabilityModule instantiated');
      if (HealthModule) console.log('   ✅ HealthModule instantiated');
      if (AuthModule) console.log('   ✅ AuthModule instantiated');
      
      console.log('🎯 AppModule constructor completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in AppModule constructor:', error);
      console.error('Stack trace:', error.stack);
      throw error; // Re-throw to prevent silent failures
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
