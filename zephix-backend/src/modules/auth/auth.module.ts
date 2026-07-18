import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OrganizationSignupController } from './controllers/organization-signup.controller';
import {
  OrgInvitesController,
  InvitesController,
} from './controllers/org-invites.controller';
import { SmokeInvitesController } from './controllers/smoke-invites.controller';
import { SmokeUsersController } from './controllers/smoke-users.controller';
import { OrganizationSignupService } from './services/organization-signup.service';
import { AuthRegistrationService } from './services/auth-registration.service';
import { EmailVerificationService } from './services/email-verification.service';
import { OrgInvitesService } from './services/org-invites.service';
import { OutboxProcessorService } from './services/outbox-processor.service';
import { User } from '../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OrgInvite } from './entities/org-invite.entity';
import { OrgInviteWorkspaceAssignment } from './entities/org-invite-workspace-assignment.entity';
import { AuthOutbox } from './entities/auth-outbox.entity';
import { AuthSession } from './entities/auth-session.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleOAuthDisabledStrategy } from './strategies/google.strategy.stub';
import { GoogleOAuthEnabledGuard } from './guards/google-oauth-enabled.guard';
import { EmailService } from '../../shared/services/email.service';
import { SessionsController } from './controllers/sessions.controller';
import { MfaController } from './controllers/mfa.controller';
import { InvitationsController } from './controllers/invitations.controller';
import { WorkspaceInvitationsService } from './services/workspace-invitations.service';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SmokeKeyGuard } from './guards/smoke-key.guard';
import { AUTH_RATE_LIMIT_STORE } from './tokens';
import { NoopAuthRateLimitStore } from './services/auth-rate-limit-store';
import { RedisAuthRateLimitStore } from './services/redis-auth-rate-limit-store';
import { AuditService } from '../audit/services/audit.service';
import { OrgProvisioningService } from './services/org-provisioning.service';
import { UserSettings } from '../users/entities/user-settings.entity';

const googleOAuthFactoryLogger = new Logger('GoogleOAuthFactory');

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      UserOrganization,
      Workspace,
      WorkspaceMember,
      EmailVerificationToken,
      PasswordResetToken,
      OrgInvite,
      OrgInviteWorkspaceAssignment,
      AuthOutbox,
      AuthSession,
      RefreshToken,
      UserSettings,
      WorkspaceInvitation,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          // jsonwebtoken 9 (via @nestjs/jwt 11) narrows expiresIn to
          // `number | ms.StringValue`; the config string is valid at runtime.
          expiresIn: (configService.get<string>('jwt.expiresIn') ||
            '24h') as any,
        },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
  ],
  controllers: [
    AuthController,
    OrganizationSignupController,
    OrgInvitesController,
    InvitesController,
    SessionsController,
    SmokeInvitesController,
    SmokeUsersController,
    MfaController,
    InvitationsController,
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    JwtStrategy,
    GoogleOAuthEnabledGuard,
    {
      provide: GoogleStrategy,
      useFactory: (
        configService: ConfigService,
        authService: AuthService,
      ): GoogleStrategy | GoogleOAuthDisabledStrategy => {
        const clientId = configService.get<string>('google.clientId')?.trim();
        const clientSecret = configService
          .get<string>('google.clientSecret')
          ?.trim();
        if (!clientId || !clientSecret) {
          googleOAuthFactoryLogger.warn(
            'Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.',
          );
          return new GoogleOAuthDisabledStrategy();
        }
        return new GoogleStrategy(configService, authService);
      },
      inject: [ConfigService, AuthService],
    },
    OrganizationSignupService,
    AuthRegistrationService,
    EmailVerificationService,
    OrgInvitesService,
    OutboxProcessorService,
    EmailService,
    CsrfGuard,
    SmokeKeyGuard,
    {
      // SEC-3: REDIS_URL present → real per-account rate limiting (Redis
      // INCR/EXPIRE, fail-open-loud). Absent (e.g. local dev) → Noop, so
      // developers are not forced to run Redis. AuditService is optional so the
      // store still constructs where audit isn't wired (mirrors AuthService).
      provide: AUTH_RATE_LIMIT_STORE,
      inject: [ConfigService, { token: AuditService, optional: true }],
      useFactory: (configService: ConfigService, auditService?: AuditService) => {
        const redisUrl =
          configService.get<string>('redis.url') || process.env.REDIS_URL;
        if (redisUrl) {
          return new RedisAuthRateLimitStore(redisUrl, auditService);
        }
        return new NoopAuthRateLimitStore();
      },
    },
    OrgProvisioningService,
    WorkspaceInvitationsService,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    EmailVerificationService,
    OrgInvitesService,
    WorkspaceInvitationsService,
    AUTH_RATE_LIMIT_STORE,
  ],
})
export class AuthModule {}
