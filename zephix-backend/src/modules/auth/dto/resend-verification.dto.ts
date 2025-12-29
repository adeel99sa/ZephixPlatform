import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Resend Verification DTO
 *
 * Uses email instead of userId to prevent enumeration.
 * Always returns neutral 200 response.
 */
export class ResendVerificationDto {
  @ApiProperty({
    description: 'Email address to resend verification for',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResendVerificationResponseDto {
  @ApiProperty({
    description: 'Neutral success message (never reveals if email exists)',
    example:
      'If an account with this email exists, you will receive a verification email.',
  })
  message: string;
}
