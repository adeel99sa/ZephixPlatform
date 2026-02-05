import { IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkResourceAllocationDto {
  @ApiPropertyOptional({ description: 'Allocation percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
