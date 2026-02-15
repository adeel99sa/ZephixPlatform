import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ChangeRequestImpactScope } from '../types/change-request.enums';

export class CreateChangeRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsEnum(ChangeRequestImpactScope)
  impactScope!: ChangeRequestImpactScope;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? null : value,
  )
  @IsString()
  impactCost?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? null
      : Number(value),
  )
  @IsInt()
  @Min(0)
  impactDays?: number | null;
}
