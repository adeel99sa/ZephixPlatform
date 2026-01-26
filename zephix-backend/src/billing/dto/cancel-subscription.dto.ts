import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Cancel immediately instead of at period end',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelNow?: boolean;
}
