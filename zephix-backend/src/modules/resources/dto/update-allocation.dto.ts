import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAllocationDto {
  @ApiProperty({
    description: 'Allocation percentage (0-150)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  allocationPercentage?: number;

  @ApiProperty({ description: 'Hours per week', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursPerWeek?: number;

  @ApiProperty({ description: 'Start date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Task ID', required: false })
  @IsOptional()
  @IsString()
  taskId?: string;
}
