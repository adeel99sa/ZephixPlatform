import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateProjectFromTemplateDto {
  @IsUUID()
  templateId: string;

  @IsString()
  projectName: string;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  customizations?: Record<string, any>;

  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;
}


