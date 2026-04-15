import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
  dateFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['waterfall', 'board', 'table', 'activities'])
  defaultView?: string;

  @IsOptional()
  @IsString()
  @IsIn(['en'])
  language?: string;
}
