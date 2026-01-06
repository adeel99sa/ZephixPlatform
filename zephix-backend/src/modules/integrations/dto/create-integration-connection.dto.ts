import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProjectMappingDto {
  @IsString()
  @IsNotEmpty()
  externalProjectKey!: string;

  @IsOptional()
  @IsString()
  zephixProjectId?: string;

  @IsOptional()
  @IsString()
  zephixWorkspaceId?: string;
}

export class CreateIntegrationConnectionDto {
  @IsEnum(['jira'])
  @IsNotEmpty()
  type!: 'jira';

  @IsUrl()
  @IsNotEmpty()
  baseUrl!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  apiToken!: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMappingDto)
  projectMappings?: ProjectMappingDto[];

  @IsOptional()
  @IsString()
  jqlFilter?: string;

  @IsOptional()
  @IsBoolean()
  pollingEnabled?: boolean = false;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}

