import { IsNotEmpty, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';

export class AllocateResourceDto {
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  @Max(200)
  allocationPercentage: number;
}
