import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  Length,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProgramStatus } from '../entities/program.entity';

export class CreateProgramDto {
  @ApiProperty({
    description: 'Portfolio ID that this program belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  portfolioId: string;

  @ApiProperty({
    description: 'Program name',
    example: 'Mobile App Development',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Program description',
    example: 'All mobile app initiatives and projects',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ProgramStatus,
    description: 'Program status',
    required: false,
    default: ProgramStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;
}
