import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AdminMarkVerifiedDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
