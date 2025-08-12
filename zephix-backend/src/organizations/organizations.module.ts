import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './services/organizations.service';
import { InvitationService } from './services/invitation.service';
import { TeamManagementService } from './services/team-management.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { TeamManagementController } from './controllers/team-management.controller';
import { InvitationAcceptanceController } from './controllers/invitation-acceptance.controller';
import { OrganizationGuard } from './guards/organization.guard';
import { RolesGuard } from './guards/roles.guard';
import { Organization, UserOrganization, Invitation } from './entities';
import { User } from '../users/entities/user.entity';
import { SharedModule } from '../shared/shared.module';

@Global() // Make OrganizationsModule globally available
@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, UserOrganization, Invitation, User]),
    SharedModule,
    // ENTERPRISE APPROACH: Remove JWT module duplication - it's already global in app.module.ts
  ],
  controllers: [
    OrganizationsController,
    TeamManagementController,
    InvitationAcceptanceController,
  ],
  providers: [
    OrganizationsService,
    InvitationService,
    TeamManagementService,
    OrganizationGuard,
    RolesGuard,
  ],
  exports: [
    OrganizationsService,
    InvitationService,
    TeamManagementService,
    OrganizationGuard,
    RolesGuard,
    TypeOrmModule, // Export the TypeORM repositories
  ],
})
export class OrganizationsModule {}
