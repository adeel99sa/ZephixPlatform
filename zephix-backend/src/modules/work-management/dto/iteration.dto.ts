import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IterationStatus } from '../entities/iteration.entity';

export class CreateIterationDto {
  @ApiProperty({ description: 'Iteration name', example: 'Sprint 1' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Sprint goal', required: false })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Capacity in hours', required: false })
  @IsOptional()
  @IsNumber()
  capacityHours?: number;
}

export class UpdateIterationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  capacityHours?: number;
}
