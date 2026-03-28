import { IsDateString, IsOptional } from 'class-validator';

export class GetKpiValuesQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
