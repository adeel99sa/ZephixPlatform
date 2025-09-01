import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationSettingsController } from './controllers/organization-settings.controller';
import { SecuritySettingsController } from './controllers/security-settings.controller';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationSettingsService } from './services/organization-settings.service';
import { SecuritySettingsService } from './services/security-settings.service';
import { Organization } from './entities/organization.entity';
import { OrganizationSettings } from './entities/organization-settings.entity';
import { SecuritySettings } from './entities/security-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization, 
      OrganizationSettings, 
      SecuritySettings
    ])
  ],
  controllers: [
    OrganizationsController,
    OrganizationSettingsController,
    SecuritySettingsController
  ],
  providers: [
    OrganizationsService,
    OrganizationSettingsService,
    SecuritySettingsService
  ],
  exports: [
    OrganizationsService,
    OrganizationSettingsService,
    SecuritySettingsService,
    TypeOrmModule
  ]
})
export class OrganizationsModule {}