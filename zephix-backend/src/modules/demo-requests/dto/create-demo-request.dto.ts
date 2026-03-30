import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDemoRequestDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Contact person name' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ description: 'Contact email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Company size', required: false })
  @IsString()
  @IsOptional()
  companySize?: string;

  @ApiProperty({ description: 'Use case description' })
  @IsString()
  @IsNotEmpty()
  useCase: string;

  @ApiProperty({ description: 'Preferred demo date', required: false })
  @IsString()
  @IsOptional()
  preferredDate?: string;

  /** Marketing campaign slug from query (e.g. resource-risk) — persisted for attribution. */
  @ApiProperty({ description: 'Campaign slug', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignSlug?: string;

  /** e.g. contact, privacy-inquiry — from query intent. */
  @ApiProperty({ description: 'Lead intent', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  leadIntent?: string;
}
