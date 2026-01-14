import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ShareEnableDto {
  @ApiPropertyOptional({
    description:
      'Expiration date in ISO 8601 format (e.g., 2026-12-31T23:59:59Z). If not provided, share link never expires.',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  expiresAt?: string;
}
