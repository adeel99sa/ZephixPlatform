import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Form]),
    WorkspaceAccessModule,
    TenancyModule,
  ],
  controllers: [FormsController],
  providers: [FormsService, createTenantAwareRepositoryProvider(Form)],
  exports: [FormsService],
})
export class FormsModule {}
