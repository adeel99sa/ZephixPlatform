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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LayoutDto {
  @ApiProperty({ description: 'X position', minimum: 0 })
  @IsNumber()
  @Min(0)
  x: number;

  @ApiProperty({ description: 'Y position', minimum: 0 })
  @IsNumber()
  @Min(0)
  y: number;

  @ApiProperty({ description: 'Width', minimum: 1, maximum: 12 })
  @IsNumber()
  @Min(1)
  @Max(12)
  w: number;

  @ApiProperty({ description: 'Height', minimum: 1, maximum: 20 })
  @IsNumber()
  @Min(1)
  @Max(20)
  h: number;
}

export class CreateWidgetDto {
  @ApiProperty({
    description: 'Widget key (must be in allowlist)',
    maxLength: 120,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  widgetKey: string;

  @ApiProperty({ description: 'Widget title', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Widget configuration (JSON object)' })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: 'Widget layout', type: LayoutDto })
  @ValidateNested()
  @Type(() => LayoutDto)
  layout: LayoutDto;
}
