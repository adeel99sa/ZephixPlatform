import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteTeamMemberDto {
  @ApiProperty({
    description: 'Email of the user to invite',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: ['admin', 'pm', 'viewer'],
    example: 'pm',
  })
  @IsEnum(['admin', 'pm', 'viewer'])
  role: 'admin' | 'pm' | 'viewer';

  @ApiPropertyOptional({
    description: 'Custom invitation message',
    example: 'Welcome to our team! We are excited to have you on board.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}
