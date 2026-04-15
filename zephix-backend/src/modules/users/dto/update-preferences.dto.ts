import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  highContrast?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyTimezoneChange?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['sunday', 'monday'])
  weekStartsOn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['12h', '24h'])
  timeFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', 'status', 'assignee', 'priority', 'dueDate'])
  defaultTaskGrouping?: string;
}
