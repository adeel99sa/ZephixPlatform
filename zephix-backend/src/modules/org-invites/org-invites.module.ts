import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgInvite } from './entities/org-invite.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { OrgInvitesService } from './services/org-invites.service';
import { OrgInvitesController } from './controllers/org-invites.controller';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgInvite, User, UserOrganization, Organization]),
    AuthModule, // Import AuthModule to use AuthService (exports AuthService)
  ],
  controllers: [OrgInvitesController],
  providers: [OrgInvitesService, RequireOrgRoleGuard],
  exports: [OrgInvitesService],
})
export class OrgInvitesModule {}
