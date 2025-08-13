import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './services/organizations.service';
import { InvitationService } from './services/invitation.service';
import { TeamManagementService } from './services/team-management.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { TeamManagementController } from './controllers/team-management.controller';
import { InvitationAcceptanceController } from './controllers/invitation-acceptance.controller';
import { Organization, UserOrganization, Invitation } from './entities';
import { User } from "../modules/users/entities/user.entity"
import { SharedModule } from '../shared/shared.module';

@Global() // Make OrganizationsModule globally available
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      UserOrganization,
      Invitation,
      User,
    ]),
    SharedModule, // For EmailService used by InvitationService
    // ENTERPRISE APPROACH: Remove JWT module duplication - it's already global in app.module.ts
  ],
  controllers: [
    OrganizationsController,
    TeamManagementController,
    InvitationAcceptanceController,
  ],
  providers: [OrganizationsService, InvitationService, TeamManagementService],
  exports: [
    OrganizationsService,
    InvitationService,
    TeamManagementService,
    TypeOrmModule, // Export the TypeORM repositories
  ],
})
export class OrganizationsModule {}
