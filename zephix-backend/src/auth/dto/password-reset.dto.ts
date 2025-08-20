import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';

/**
 * Password Reset Request DTO
 *
 * Used for initiating password reset flow.
 * Following OWASP ASVS Level 1 requirements for account enumeration protection.
 */
export class PasswordResetRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * Password Reset Confirmation DTO
 *
 * Used for completing password reset with token and new password.
 * Implements strong password requirements (OWASP ASVS Level 1).
 */
export class PasswordResetConfirmDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456',
    minLength: 32,
  })
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  @MinLength(32, { message: 'Invalid reset token format' })
  token: string;

  @ApiProperty({
    description:
      'New password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'NewStrongP@ssw0rd!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match newPassword)',
    example: 'NewStrongP@ssw0rd!',
    minLength: 8,
  })
  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

/**
 * Password Reset Response DTOs
 */
export class PasswordResetResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Request timestamp' })
  timestamp?: string;
}
