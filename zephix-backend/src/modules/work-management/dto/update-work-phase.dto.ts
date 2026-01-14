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

  // These fields are explicitly disallowed after ACTIVE
  // Included in DTO for validation, but will be rejected by service
  @ApiProperty({
    description: 'Sort order (disallowed after start)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({
    description: 'Reporting key (disallowed after start)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  reportingKey?: string;

  @ApiProperty({
    description: 'Is milestone (disallowed after start)',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;
}
