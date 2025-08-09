import { IsString, IsOptional, IsEnum, IsUrl, Length, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({
    description: 'Organization slug (auto-generated if not provided)',
    example: 'acme-corp',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Leading provider of enterprise solutions',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization industry',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Organization size',
    enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
    example: 'medium',
  })
  @IsOptional()
  @IsEnum(['startup', 'small', 'medium', 'large', 'enterprise'])
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  @ApiPropertyOptional({
    description: 'Trial end date (for trial organizations)',
    example: '2024-03-01',
  })
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @ApiPropertyOptional({
    description: 'Organization settings',
    example: { timezone: 'UTC', currency: 'USD' },
  })
  @IsOptional()
  settings?: Record<string, any>;
}
