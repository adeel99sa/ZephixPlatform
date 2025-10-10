import { IsString, IsOptional, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentWorkspaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  workspaceType?: string;

  // Legacy fields for backward compatibility
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}