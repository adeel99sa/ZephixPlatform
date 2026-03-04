import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SmokeLoginDto {
  @ApiProperty({
    example: 'staging+smoke@zephix.dev',
    description: 'Smoke test email restricted to zephix.dev domain',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
