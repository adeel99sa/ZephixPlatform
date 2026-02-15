import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ChangeRequestImpactScope } from '../types/change-request.enums';

export class UpdateChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsEnum(ChangeRequestImpactScope)
  impactScope?: ChangeRequestImpactScope;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : value,
  )
  @IsString()
  impactCost?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : Number(value),
  )
  @IsInt()
  @Min(0)
  impactDays?: number | null;
}
