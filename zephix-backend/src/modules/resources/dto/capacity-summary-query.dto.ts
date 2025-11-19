import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CapacitySummaryQueryDto {
  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  resourceId?: string;
}
