import { IsString, IsUUID, IsOptional, IsInt, Min, Max, Matches, IsArray } from 'class-validator';

export class CreateFolderDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  @IsOptional()
  parentFolderId?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color (e.g., #FF5733)' })
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class UpdateFolderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsUUID()
  @IsOptional()
  parentFolderId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class MoveProjectDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  @IsOptional()
  folderId?: string; // null = move to workspace root
}

export class BulkMoveDto {
  @IsArray()
  @IsUUID(4, { each: true })
  projectIds: string[];

  @IsUUID()
  @IsOptional()
  folderId?: string;
}
