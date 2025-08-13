import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OrganizationSignupController } from './controllers/organization-signup.controller';
import { OrganizationSignupService } from './services/organization-signup.service';
import { EmailVerificationService } from './services/email-verification.service';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// Local strategy and guard removed - using JWT strategy instead
import { SharedModule } from '../shared/shared.module';

/**
 * Authentication Module
 *
 * Provides JWT-based authentication with bcrypt password hashing.
 *
 * ENTERPRISE APPROACH: JWT module is now global in app.module.ts
 * This eliminates circular dependencies and module duplication.
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
    TypeOrmModule.forFeature([
      User,
      Organization,
      UserOrganization,
      EmailVerification,
    ]),
    PassportModule,
    SharedModule, // For EmailService used by EmailVerificationService
    // ENTERPRISE APPROACH: JWT module is now global - no need to import here
  ],
  controllers: [AuthController, OrganizationSignupController],
  providers: [
    AuthService,
    OrganizationSignupService,
    EmailVerificationService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, EmailVerificationService, JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
