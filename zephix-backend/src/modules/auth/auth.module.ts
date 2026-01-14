import { Module } from '@nestjs/common';
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
import { OrgInvite } from './entities/org-invite.entity';
import { OrgInviteWorkspaceAssignment } from './entities/org-invite-workspace-assignment.entity';
import { AuthOutbox } from './entities/auth-outbox.entity';
import { AuthSession } from './entities/auth-session.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailService } from '../../shared/services/email.service';
import { SessionsController } from './controllers/sessions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      UserOrganization,
      Workspace,
      WorkspaceMember,
      EmailVerificationToken,
      OrgInvite,
      OrgInviteWorkspaceAssignment,
      AuthOutbox,
      AuthSession,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '24h',
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
  ],
  providers: [
    AuthService,
    JwtStrategy,
    OrganizationSignupService,
    AuthRegistrationService,
    EmailVerificationService,
    OrgInvitesService,
    OutboxProcessorService,
    EmailService,
  ],
  exports: [AuthService, JwtStrategy, EmailVerificationService],
})
export class AuthModule {}
