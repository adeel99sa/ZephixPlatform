import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { WorkspaceInvitation } from '../auth/entities/workspace-invitation.entity';
import { AuthorizationService } from '../../common/auth/authorization.service';
import { MfaSecretCipherService } from '../../common/security/mfa-secret-cipher.service';
import { MfaService } from '../auth/services/mfa.service';
import { IdentityService } from '../users/services/identity.service';
import {
  IDENTITY_EVENT_BUS,
  NoOpIdentityEventBus,
} from '../../common/events/identity-event-bus';

/**
 * Transitional module wiring B1 (RBAC foundations) services.
 *
 * Why a single module: the new services span multiple natural homes
 * (modules/auth, modules/users, common/auth, common/security). Adding each
 * to its respective existing module would touch four module files and
 * complicate review of PR1. This module concentrates the wiring at one
 * import site (AppModule). When PR2 (cutover) lands controllers and
 * production usage, services move to their natural modules and this
 * module dissolves.
 *
 * @Global so consumers don't need to import RbacFoundationsModule
 * explicitly — services are available throughout the app like the other
 * cross-cutting providers.
 *
 * IDENTITY_EVENT_BUS is bound to NoOpIdentityEventBus in PR1; PR2 swaps
 * in OutboxIdentityEventBus that writes to the existing auth_outbox
 * table (ADR-011).
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §4.1.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserOrganization,
      WorkspaceMember,
      WorkspaceInvitation,
    ]),
  ],
  providers: [
    AuthorizationService,
    IdentityService,
    MfaService,
    MfaSecretCipherService,
    {
      provide: IDENTITY_EVENT_BUS,
      useClass: NoOpIdentityEventBus,
    },
  ],
  exports: [
    AuthorizationService,
    IdentityService,
    MfaService,
    MfaSecretCipherService,
    IDENTITY_EVENT_BUS,
  ],
})
export class RbacFoundationsModule {}
