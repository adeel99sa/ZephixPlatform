import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OrganizationSignupController } from './controllers/organization-signup.controller';
import { OrganizationSignupService } from './services/organization-signup.service';
import { EmailVerificationService } from './services/email-verification.service';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity'; // ← CRITICAL FIX: Add RefreshToken import
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
 * EMERGENCY MODE: When SKIP_DATABASE=true, TypeORM features are disabled
 * This allows basic API structure to work without database connection.
 *
 * CRITICAL FIX: RefreshToken entity now properly registered to resolve
 * TypeORM metadata error: "Entity metadata for User#refreshTokens was not found"
 *
 * MICROSERVICE EXTRACTION NOTES:
 * - This entire module can be moved to a dedicated auth microservice
 * - JWT configuration should be shared across services
 * - Database connection can be moved to a separate user service
 * - Consider using Redis for token storage in distributed systems
 * - Guards and strategies can be shared via a common auth library
 */
@Global() // Make AuthModule available everywhere without importing in every module
@Module({
  imports: [
    // EMERGENCY MODE: Only import TypeORM features when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [
          TypeOrmModule.forFeature([
            User,
            Organization,
            UserOrganization,
            EmailVerification,
            RefreshToken,        // ← CRITICAL FIX: Add RefreshToken to entity registration
          ]),
        ]
      : []),
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
  exports: [AuthService, EmailVerificationService, JwtAuthGuard, JwtStrategy], // export providers used elsewhere
})
export class AuthModule {
  constructor() {
    // EMERGENCY MODE: Log current configuration
    if (process.env.SKIP_DATABASE === 'true') {
      console.log('🚨 AuthModule: Emergency mode - TypeORM features disabled');
      console.log(
        '🚨 Authentication will be limited (no user validation, no persistence)',
      );
    } else {
      console.log('✅ AuthModule: Full mode - TypeORM features enabled');
      console.log('✅ RefreshToken entity registered - metadata error resolved');
    }
  }
}