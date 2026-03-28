import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateKpiConfigItemDto {
  @IsString()
  @IsNotEmpty()
  kpiCode!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  thresholdWarning?: Record<string, any>;

  @IsOptional()
  @IsObject()
  thresholdCritical?: Record<string, any>;

  @IsOptional()
  @IsObject()
  target?: Record<string, any>;
}

export class UpdateKpiConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateKpiConfigItemDto)
  items!: UpdateKpiConfigItemDto[];
}
