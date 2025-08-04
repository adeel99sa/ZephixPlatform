import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

/**
 * Authentication Module
 * 
 * Provides JWT-based authentication with bcrypt password hashing.
 * 
 * MICROSERVICE EXTRACTION NOTES:
 * - This entire module can be moved to a dedicated auth microservice
 * - JWT configuration should be shared across services
 * - Database connection can be moved to a separate user service
 * - Consider using Redis for token storage in distributed systems
 * - Guards and strategies can be shared via a common auth library
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    LocalStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
  ],
  exports: [
    AuthService, 
    JwtAuthGuard, 
    LocalAuthGuard,
    JwtStrategy,
    LocalStrategy,
  ],
})
export class AuthModule {}
