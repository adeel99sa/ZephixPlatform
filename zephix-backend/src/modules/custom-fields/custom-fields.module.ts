import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomField } from './entities/custom-field.entity';
import { CustomFieldsService } from './services/custom-fields.service';
import { CustomFieldsController } from './custom-fields.controller';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomField]),
    TenancyModule, // Required for TenantAwareRepository
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entity
    createTenantAwareRepositoryProvider(CustomField),
    CustomFieldsService,
    RequireOrgRoleGuard,
  ],
  controllers: [CustomFieldsController],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
