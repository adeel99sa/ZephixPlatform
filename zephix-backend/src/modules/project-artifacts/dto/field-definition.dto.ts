import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const FIELD_TYPES = [
  'text',
  'number',
  'date',
  'enum',
  'person',
  'rating',
  'currency',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/**
 * One column in an artifact's custom_field_definitions array.
 *
 * `id` is the stable slug used in items' `custom_field_values` keys.
 * If omitted by the client, the service derives it from `name`.
 */
export class FieldDefinitionDto {
  @ApiPropertyOptional({
    description: 'Stable slug (auto-derived from name when omitted)',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'id must be lowercase alphanumeric with underscores only',
  })
  id?: string;

  @ApiProperty({ description: 'Display name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: FIELD_TYPES })
  @IsEnum(FIELD_TYPES)
  type: FieldType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Allowed values when type=enum',
    type: [String],
  })
  @ValidateIf((o: FieldDefinitionDto) => o.type === 'enum')
  @IsArray()
  @IsString({ each: true })
  enumValues?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ description: 'Column sort order', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
