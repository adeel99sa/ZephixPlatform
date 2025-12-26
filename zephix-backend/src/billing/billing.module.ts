import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription]),
    TenancyModule, // Required for TenantAwareRepository
  ],
  providers: [
    // Provide TenantAwareRepository for tenant-scoped entity
    createTenantAwareRepositoryProvider(Subscription),
    PlansService,
    SubscriptionsService,
  ],
  controllers: [BillingController],
  exports: [PlansService, SubscriptionsService],
})
export class BillingModule {}
