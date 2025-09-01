import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
  };
}

export class VerificationStatusResponseDto {
  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  pendingVerification: boolean;

  @ApiProperty({ required: false })
  lastSentAt?: Date;
}
