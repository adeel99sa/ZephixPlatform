import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateWorkflowDto } from './template-workflow.dto';

export class TemplateImportOptionsDto {
  @IsBoolean()
  includeViews: boolean;

  @IsBoolean()
  includeTasks: boolean;

  @IsBoolean()
  includePhases: boolean;

  @IsBoolean()
  includeMilestones: boolean;

  @IsBoolean()
  includeCustomFields: boolean;

  @IsBoolean()
  includeDependencies: boolean;

  @IsBoolean()
  remapDates: boolean;
}

export class CreateProjectFromTemplateDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ValidateNested()
  @Type(() => TemplateImportOptionsDto)
  importOptions: TemplateImportOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateWorkflowDto)
  workflow?: TemplateWorkflowDto;
}
