import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkItem } from './entities/work-item.entity';
import { WorkItemService } from './work-item.service';
import { WorkItemController } from './work-item.controller';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkItem]),
    TenancyModule, // Required for TenantAwareRepository
  ],
  providers: [createTenantAwareRepositoryProvider(WorkItem), WorkItemService],
  controllers: [WorkItemController],
  exports: [WorkItemService],
})
export class WorkItemModule {}
