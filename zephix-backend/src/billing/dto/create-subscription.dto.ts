import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '../entities/plan.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Plan ID to subscribe to',
    example: 'uuid-of-plan',
  })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({
    description: 'Plan type (legacy support, prefer planId)',
    enum: PlanType,
  })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({
    description: 'Stripe payment method ID (if using Stripe)',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Whether to start with annual billing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  annual?: boolean;
}
