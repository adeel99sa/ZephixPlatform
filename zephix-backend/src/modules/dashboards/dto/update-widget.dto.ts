import {
  IsString,
  IsObject,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class LayoutDto {
  @ApiPropertyOptional({ description: 'X position', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  x?: number;

  @ApiPropertyOptional({ description: 'Y position', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  y?: number;

  @ApiPropertyOptional({ description: 'Width', minimum: 1, maximum: 12 })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  w?: number;

  @ApiPropertyOptional({ description: 'Height', minimum: 1, maximum: 20 })
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  h?: number;
}

export class UpdateWidgetDto {
  @ApiPropertyOptional({ description: 'Widget key (must be in allowlist)', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @IsOptional()
  widgetKey?: string;

  @ApiPropertyOptional({ description: 'Widget title', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Widget configuration (JSON object)' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Widget layout', type: LayoutDto })
  @ValidateNested()
  @Type(() => LayoutDto)
  @IsOptional()
  layout?: LayoutDto;
}

