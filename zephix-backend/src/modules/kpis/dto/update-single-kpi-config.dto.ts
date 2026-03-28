import {
  IsOptional,
  IsBoolean,
  IsString,
  IsObject,
  Matches,
} from 'class-validator';

export class UpdateSingleKpiConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'targetValue must be a numeric string with up to 2 decimals',
  })
  targetValue?: string;

  @IsOptional()
  @IsObject()
  thresholdsJson?: Record<string, any>;
}
