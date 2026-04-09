import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkPhaseDto {
  @ApiProperty({ description: 'Phase name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Due date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    description: 'Sort order',
    required: false,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({
    description: 'Reporting key',
    required: false,
  })
  @IsOptional()
  @IsString()
  reportingKey?: string;

  @ApiProperty({
    description: 'Whether this phase is a milestone',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;
}
