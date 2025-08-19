import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OrganizationSignupController } from './controllers/organization-signup.controller';
import { OrganizationSignupService } from './services/organization-signup.service';
import { EmailVerificationService } from './services/email-verification.service';
import { KeyLoaderService } from './services/key-loader.service';
import { JwtSignerService } from './services/jwt-signer.service';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SharedModule } from '../shared/shared.module';
import jwtConfig from '../config/jwt.config';

/**
 * Authentication Module
 *
 * Provides JWT-based authentication with bcrypt password hashing.
 * Supports both HS256 and RS256 algorithms with proper configuration.
 * Includes key rotation support via KeyLoaderService.
 * Separate strategies for access and refresh tokens.
 */
@Global()
@Module({
  imports: [
    // JWT Configuration
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY, KeyLoaderService],
      useFactory: (jwt: ReturnType<typeof jwtConfig>, keyLoader: KeyLoaderService) => {
        if (jwt.algorithm === 'RS256') {
          // RS256: Use private key with secretOrKeyProvider
          const signingKey = keyLoader.getCurrentSigningKey() as any;
          return {
            privateKey: signingKey.privateKey,
            signOptions: { 
              algorithm: 'RS256', 
              expiresIn: jwt.expiresIn,
              issuer: jwt.issuer,
              audience: jwt.audience,
              keyid: jwt.keyId,
            },
            verifyOptions: {
              issuer: jwt.issuer,
              audience: jwt.audience,
              algorithms: ['RS256'],
              clockTolerance: 10,
            },
          };
        } else {
          // HS256: Use secret directly
          const signingKey = keyLoader.getCurrentSigningKey() as any;
          return {
            secret: signingKey.secret,
            signOptions: { 
              algorithm: 'HS256', 
              expiresIn: jwt.expiresIn,
              issuer: jwt.issuer,
              audience: jwt.audience,
              keyid: jwt.keyId,
            },
            verifyOptions: {
              issuer: jwt.issuer,
              audience: jwt.audience,
              algorithms: ['HS256'],
              clockTolerance: 10,
            },
          };
        }
      },
    }),
    // EMERGENCY MODE: Only import TypeORM features when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          TypeOrmModule.forFeature([
            User,
            Organization,
            UserOrganization,
            EmailVerification,
            RefreshToken,
          ]),
        ]
      : []),
    PassportModule,
    SharedModule,
  ],
  controllers: [AuthController, OrganizationSignupController],
  providers: [
    AuthService,
    OrganizationSignupService,
    EmailVerificationService,
    KeyLoaderService,
    JwtSignerService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, EmailVerificationService, JwtAuthGuard, JwtStrategy, JwtRefreshStrategy, JwtModule, KeyLoaderService, JwtSignerService],
})
export class AuthModule {
  constructor() {
    if (process.env.SKIP_DATABASE === 'true') {
      console.log('🚨 AuthModule: Emergency mode - TypeORM features disabled');
    } else {
      console.log('✅ AuthModule: Full mode - TypeORM features enabled');
    }
  }
}