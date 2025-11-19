import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomField } from './entities/custom-field.entity';
import { CustomFieldsService } from './services/custom-fields.service';
import { CustomFieldsController } from './custom-fields.controller';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CustomField])],
  providers: [CustomFieldsService, RequireOrgRoleGuard],
  controllers: [CustomFieldsController],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
