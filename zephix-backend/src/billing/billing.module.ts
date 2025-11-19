import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { BillingController } from './controllers/billing.controller';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription])],
  controllers: [BillingController],
  providers: [PlansService, SubscriptionsService],
  exports: [PlansService, SubscriptionsService],
})
export class BillingModule {}
