import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
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
