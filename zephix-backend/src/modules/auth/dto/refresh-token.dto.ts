import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'your-refresh-token',
    required: false,
    description:
      'Optional when the browser sends the HttpOnly `zephix_refresh` cookie (SPA cookie auth).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
