import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';

import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
        
        if (databaseUrl) {
          // Use DATABASE_URL if available (Railway)
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, Feedback],
            synchronize: configService.get('database.synchronize'),
            logging: configService.get('database.logging'),
            ssl: {
              rejectUnauthorized: false,
            },
            // Connection pooling for better performance
            extra: {
              max: 20, // Maximum number of connections
              min: 5,  // Minimum number of connections
              acquire: 30000, // Maximum time to acquire connection
              idle: 10000, // Maximum time connection can be idle
            },
            // Retry configuration
            retryAttempts: 10,
            retryDelay: 3000,
            // Keep connection alive
            keepConnectionAlive: true,
          };
        } else {
          // Fallback to individual parameters (local development)
          return {
            type: 'postgres',
            host: configService.get('database.host'),
            port: configService.get('database.port'),
            username: configService.get('database.username'),
            password: configService.get('database.password'),
            database: configService.get('database.database'),
            entities: [User, Feedback],
            synchronize: configService.get('database.synchronize'),
            logging: configService.get('database.logging'),
            // Connection pooling for development
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
