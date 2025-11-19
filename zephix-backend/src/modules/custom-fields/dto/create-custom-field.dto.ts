import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import {
  CustomFieldType,
  CustomFieldScope,
} from '../entities/custom-field.entity';

export class CreateCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsEnum([
    'text',
    'number',
    'date',
    'boolean',
    'select',
    'multiselect',
    'textarea',
  ])
  @IsNotEmpty()
  type!: CustomFieldType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsEnum(['project', 'task', 'workspace', 'all'])
  @IsOptional()
  scope?: CustomFieldScope;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
