import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  /** When true, client may derive timezone from the browser; stored value still updated on save. */
  @IsOptional()
  @IsBoolean()
  timezoneAuto?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
  dateFormat?: string;

  /** Number grouping: default (locale), US (1,000.00), EU (1.000,00). */
  @IsOptional()
  @IsString()
  @IsIn(['default', 'en_US', 'eu'])
  numberFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['en'])
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['sunday', 'monday'])
  weekStartsOn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['12h', '24h'])
  timeFormat?: string;
}
