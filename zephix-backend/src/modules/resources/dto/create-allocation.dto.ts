import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  ValidateIf,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AllocationType } from '../enums/allocation-type.enum';
import { BookingSource } from '../enums/booking-source.enum';
import { UnitsType } from '../enums/units-type.enum';

export class CreateAllocationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  resourceId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', required: false })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    enum: UnitsType,
    description: 'Units type: PERCENT or HOURS',
    required: false,
    default: UnitsType.PERCENT,
  })
  @IsOptional()
  @IsEnum(UnitsType)
  unitsType?: UnitsType;

  @ApiProperty({ example: 50, minimum: 0, maximum: 150, required: false })
  @ValidateIf((o) => o.unitsType === UnitsType.PERCENT || !o.unitsType)
  @IsInt()
  @Min(0)
  @Max(150) // From PRD: max 150%
  @IsOptional()
  allocationPercentage?: number;

  @ApiProperty({ example: 8, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hoursPerDay?: number;

  @ApiProperty({ example: 40, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hoursPerWeek?: number;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-01-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    enum: AllocationType,
    description:
      'Allocation type (HARD=Committed, SOFT=Tentative, GHOST=Scenario)',
    required: false,
    default: AllocationType.SOFT,
  })
  @IsOptional()
  @IsEnum(AllocationType)
  type?: AllocationType;

  @ApiProperty({
    enum: BookingSource,
    description: 'Booking source (MANUAL, JIRA, GITHUB, AI)',
    required: false,
    default: BookingSource.MANUAL,
  })
  @IsOptional()
  @IsEnum(BookingSource)
  bookingSource?: BookingSource;

  @ApiProperty({
    description:
      'Justification for allocation (required if percentage exceeds threshold)',
    required: false,
  })
  @IsOptional()
  @IsString()
  justification?: string;
}
