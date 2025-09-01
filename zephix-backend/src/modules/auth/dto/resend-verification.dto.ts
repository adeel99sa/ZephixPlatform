import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    description: 'User ID to resend verification email for',
    example: 'uuid-user-id',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
