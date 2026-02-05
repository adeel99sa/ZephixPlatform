import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkPhaseDto {
  @ApiProperty({ description: 'Project ID', required: true })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Phase name', required: true })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Due date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Is milestone', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isMilestone?: boolean;
}
