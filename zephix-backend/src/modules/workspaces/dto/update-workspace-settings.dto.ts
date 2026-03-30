import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateWorkspaceSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';

  @IsOptional()
  @IsString()
  @IsIn(['waterfall', 'agile', 'scrum', 'kanban', 'hybrid'])
  defaultMethodology?: string;

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsUUID('4')
  defaultTemplateId?: string | null;

  @IsOptional()
  @IsBoolean()
  inheritOrgDefaultTemplate?: boolean;

  @IsOptional()
  @IsIn(['ORG_DEFAULT', 'WORKSPACE_OVERRIDE'])
  governanceInheritanceMode?: 'ORG_DEFAULT' | 'WORKSPACE_OVERRIDE';

  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsArray()
  @IsUUID('4', { each: true })
  allowedTemplateIds?: string[] | null;

  @IsOptional()
  @IsObject()
  permissionsConfig?: Record<string, string[]>;
}
