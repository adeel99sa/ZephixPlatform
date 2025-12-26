import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  IsObject,
  IsIn,
} from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @Length(2, 120)
  @IsOptional()
  name?: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @Length(2, 120)
  @IsOptional()
  slug?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  // Phase 3: Additional fields
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsIn(['waterfall', 'agile', 'scrum', 'kanban', 'hybrid'])
  @IsOptional()
  defaultMethodology?: string;

  @IsObject()
  @IsOptional()
  permissionsConfig?: Record<string, string[]>;
}
