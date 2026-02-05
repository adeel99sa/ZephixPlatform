import {
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkResourceAllocationDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'User ID to allocate' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Allocation percentage (0-100)',
    default: 100,
  })
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
