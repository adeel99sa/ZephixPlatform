import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsEnum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  templateId?: string;  // ADD THIS FIELD

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  methodology?: string;

  @ApiPropertyOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  stakeholders?: string[];
}