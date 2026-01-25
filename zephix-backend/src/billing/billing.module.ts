import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { BillingController } from './controllers/billing.controller';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../modules/tenancy/tenancy.module';
import { RequireOrgRoleGuard } from '../modules/workspaces/guards/require-org-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription]),
    TenancyModule, // Required for TenantAwareRepository
    ConfigModule, // Required for ConfigService in SubscriptionsService
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entity
    createTenantAwareRepositoryProvider(Subscription),
    PlansService,
    SubscriptionsService,
    RequireOrgRoleGuard, // Required for @RequireOrgRole decorator
  ],
  controllers: [BillingController],
  exports: [PlansService, SubscriptionsService],
})
export class BillingModule {}
