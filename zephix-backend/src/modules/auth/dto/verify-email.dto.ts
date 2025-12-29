import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Verify Email DTO
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Email verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User ID (for frontend to redirect)',
    example: 'uuid-user-id',
  })
  userId: string;
}
