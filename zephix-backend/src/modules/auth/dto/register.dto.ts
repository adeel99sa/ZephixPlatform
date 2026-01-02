import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
  IsOptional,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Register DTO for self-serve signup
 *
 * Phase 1 specification:
 * - email, password, fullName, orgName (required)
 * - orgSlug (optional, validated if provided)
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'User password (min 8 chars, must contain uppercase, lowercase, number, and special char)',
    example: 'SecurePass123!@#',
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
    },
  )
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  fullName: string;

  @ApiProperty({
    description: 'Organization name (required, 2-80 characters)',
    example: 'Acme Corp',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  orgName: string;

  @ApiProperty({
    description:
      'Organization slug (optional, 3-48 chars, lowercase letters, numbers, hyphens only). If not provided, generated from orgName.',
    example: 'acme-corp',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 48)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  orgSlug?: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Neutral success message (never reveals if email exists)',
    example:
      'If an account with this email exists, you will receive a verification email.',
  })
  message: string;
}
