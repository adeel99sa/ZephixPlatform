import { IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';

export enum HeatMapView {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
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

  // organizationId removed - now comes from tenant context (req.user.organizationId)
  // Keeping for backward compatibility but will be ignored

  @IsOptional()
  @IsEnum(HeatMapView)
  view?: HeatMapView = HeatMapView.WEEK;
}
