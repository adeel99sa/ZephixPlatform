import { IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';

export enum HeatMapView {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter'
}

export class HeatMapQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(HeatMapView)
  view?: HeatMapView = HeatMapView.WEEK;
}
