import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ARTIFACT_ITEM_PRIORITIES = [
  'urgent',
  'high',
  'normal',
  'low',
] as const;
export type ArtifactItemPriorityValue =
  (typeof ARTIFACT_ITEM_PRIORITIES)[number];

export class CreateItemDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({
    description: 'Free-form structured content',
    default: {},
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: ARTIFACT_ITEM_PRIORITIES })
  @IsOptional()
  @IsEnum(ARTIFACT_ITEM_PRIORITIES)
  priority?: ArtifactItemPriorityValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description:
      'Values keyed by custom_field_definitions[].id; validated against the artifact schema',
    default: {},
  })
  @IsOptional()
  @IsObject()
  customFieldValues?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'Parent item id for nested rows' })
  @IsOptional()
  @IsUUID()
  parentItemId?: string;
}
