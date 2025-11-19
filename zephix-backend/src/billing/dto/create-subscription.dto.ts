import { IsUUID, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '../entities/plan.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Plan type to subscribe to',
    enum: PlanType,
    example: PlanType.PROFESSIONAL,
  })
  @IsEnum(PlanType)
  planType: PlanType;

  @ApiPropertyOptional({
    description: 'Stripe payment method ID (if using Stripe)',
  })
  @IsOptional()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Whether to start with annual billing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  annual?: boolean;
}
