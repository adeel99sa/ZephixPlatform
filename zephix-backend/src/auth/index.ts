// Authentication Module Exports
// This file exports all authentication components for easy importing

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { LocalAuthGuard } from './guards/local-auth.guard';

// Strategies
export { JwtStrategy } from './strategies/jwt.strategy';
export { LocalStrategy } from './strategies/local.strategy';

// DTOs
export { RegisterDto } from './dto/register.dto';
export { LoginDto } from './dto/login.dto';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';

// Services
export { AuthService } from './auth.service';

// Controllers
export { AuthController } from './auth.controller';

// Module
export { AuthModule } from './auth.module';

/**
 * MICROSERVICE EXTRACTION NOTES:
 *
 * When extracting to a separate auth microservice:
 * 1. Copy this entire auth directory to the new service
 * 2. Update imports to use relative paths
 * 3. Create a shared auth library for guards and strategies
 * 4. Update JWT configuration to be shared across services
 * 5. Consider using Redis for token storage and blacklisting
 * 6. Implement refresh tokens for better security
 * 7. Add rate limiting and security headers
 * 8. Create health check endpoints for the auth service
 */
