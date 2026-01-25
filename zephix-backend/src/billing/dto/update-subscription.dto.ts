import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType, BillingCycle } from '../entities/plan.entity';
import { SubscriptionStatus } from '../entities/subscription.entity';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'New plan ID',
    example: 'uuid-of-plan',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    description: 'New plan type (legacy support, prefer planId)',
    enum: PlanType,
  })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({
    description: 'Billing cycle',
    enum: BillingCycle,
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    description: 'Subscription status',
    enum: SubscriptionStatus,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Auto-renew setting',
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
