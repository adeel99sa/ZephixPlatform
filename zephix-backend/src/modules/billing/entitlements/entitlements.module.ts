import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { WorkspaceStorageUsage } from '../entities/workspace-storage-usage.entity';
import { EntitlementService } from './entitlement.service';
import { EntitlementGuard } from './require-entitlement.guard';
import { PlanStatusGuard } from './plan-status.guard';

/**
 * Phase 3A: Global entitlements module.
 *
 * @Global so EntitlementService and guards are available everywhere
 * without explicit imports in every module.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, WorkspaceStorageUsage]),
  ],
  providers: [EntitlementService, EntitlementGuard, PlanStatusGuard],
  exports: [EntitlementService, EntitlementGuard, PlanStatusGuard],
})
export class EntitlementsModule {}
