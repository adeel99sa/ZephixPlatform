import {
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DetectConflictsDto {
  @ApiProperty({
    description: 'Resource ID to check conflicts for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  resourceId: string;

  @ApiProperty({
    description: 'Allocation start date',
    example: '2025-01-01',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Allocation end date',
    example: '2025-01-31',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Allocation percentage (0-150)',
    example: 50,
    minimum: 0,
    maximum: 150,
  })
  @IsInt()
  @Min(0, { message: 'Allocation percentage cannot be negative' })
  @Max(150, { message: 'Allocation percentage cannot exceed 150%' })
  allocationPercentage: number;
}
