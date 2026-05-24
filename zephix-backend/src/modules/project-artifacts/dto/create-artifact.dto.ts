import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ARTIFACT_TYPE_VALUES } from '../constants/default-custom-field-definitions';
import { ProjectArtifactType } from '../entities/project-artifact.entity';
import { FieldDefinitionDto } from './field-definition.dto';

export class CreateArtifactDto {
  @ApiProperty({
    enum: ARTIFACT_TYPE_VALUES,
    description: 'Artifact kind (immutable after creation)',
  })
  @IsEnum(ARTIFACT_TYPE_VALUES)
  type: ProjectArtifactType;

  @ApiProperty({ description: 'Display name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'Optional source template id' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Optional default status group id (reserved)',
  })
  @IsOptional()
  @IsUUID()
  statusGroupId?: string;

  @ApiPropertyOptional({
    description:
      'When omitted and a default schema exists for the type, defaults are applied. Pass [] to explicitly seed no fields.',
    type: [FieldDefinitionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinitionDto)
  customFieldDefinitions?: FieldDefinitionDto[];
}
