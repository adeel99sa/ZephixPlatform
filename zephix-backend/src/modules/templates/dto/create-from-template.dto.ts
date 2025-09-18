import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateProjectFromTemplateDto {
  @IsUUID()
  templateId: string;

  @IsString()
  projectName: string;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsOptional()
  customizations?: Record<string, any>;
}


