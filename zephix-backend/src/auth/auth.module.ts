import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OrganizationSignupController } from './controllers/organization-signup.controller';
import { OrganizationSignupService } from './services/organization-signup.service';
import { EmailVerificationService } from './services/email-verification.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { EmailVerification } from './entities/email-verification.entity';

import { SharedModule } from '../shared/shared.module';
import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN') || '15m' }
      })
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      User,
      Organization,
      UserOrganization,
      EmailVerification
    ]),
    UsersModule,
    SharedModule
  ],
  controllers: [AuthController, OrganizationSignupController],
  providers: [
    AuthService,
    OrganizationSignupService,
    EmailVerificationService,
    JwtStrategy,
    JwtAuthGuard
  ],
  exports: [AuthService, EmailVerificationService, JwtAuthGuard, JwtStrategy, JwtModule]
})
export class AuthModule {}
