import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SprintStatus } from '../entities/sprint.entity';

export class UpdateSprintDto {
  @ApiProperty({ description: 'Sprint name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'Sprint goal', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goal?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Sprint status', enum: SprintStatus, required: false })
  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;
}
