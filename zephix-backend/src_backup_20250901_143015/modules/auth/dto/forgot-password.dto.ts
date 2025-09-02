import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset to',
    example: 'user@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
