import { IsString, IsEmail, IsOptional, Length, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationSignupDto {
  // User information
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50)
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @Length(8, 128)
  password: string;

  // Organization information
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  organizationName: string;

  @ApiPropertyOptional({
    description: 'Organization slug (auto-generated if not provided)',
    example: 'acme-corp',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  organizationSlug?: string;

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsString()
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
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}
