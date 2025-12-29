import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Register DTO for self-serve signup
 *
 * Matches the recommended Flow A specification:
 * - email, password, fullName, orgName
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
    description: 'User password (min 8 chars, must contain uppercase, lowercase, number, and special char)',
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
  fullName: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corp',
  })
  @IsString()
  @IsNotEmpty()
  orgName: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Neutral success message (never reveals if email exists)',
    example: 'If an account with this email exists, you will receive a verification email.',
  })
  message: string;
}
