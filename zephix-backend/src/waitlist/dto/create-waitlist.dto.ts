import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWaitlistDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@company.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Acme Corp', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ 
    example: 'Resource conflicts are invisible until too late',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  biggestChallenge?: string;

  @ApiProperty({ example: 'landing-page', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}
