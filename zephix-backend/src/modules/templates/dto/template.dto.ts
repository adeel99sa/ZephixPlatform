import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export type LockState = 'UNLOCKED' | 'LOCKED';

export class TemplateListQueryDto {
  @IsOptional()
  @IsString()
  isDefault?: string;

  @IsOptional()
  @IsString()
  isSystem?: string;

  @IsOptional()
  @IsEnum(['UNLOCKED', 'LOCKED'])
  lockState?: LockState;

  @IsOptional()
  @IsString()
  includeBlocks?: string;
}

export class CreateTemplateDto {
  @IsEnum(['SYSTEM', 'ORG', 'WORKSPACE'])
  @IsOptional()
  templateScope?: 'SYSTEM' | 'ORG' | 'WORKSPACE';

  @IsUUID()
  @IsOptional()
  workspaceId?: string | null;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['project', 'board', 'mixed'])
  @IsOptional()
  kind?: 'project' | 'board' | 'mixed';

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  methodology?: string;

  @IsOptional()
  metadata?: any;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultEnabledKPIs?: string[];

  @IsOptional()
  structure?: Record<string, any>;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  methodology?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  structure?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  defaultEnabledKPIs?: string[];
}

export class CloneTemplateDto {
  name?: string;
}

export class AttachBlockDto {
  blockId: string;
  enabled?: boolean;
  displayOrder?: number;
  config?: any;
  locked?: boolean;
}

export class ReorderBlocksDto {
  items: Array<{ blockId: string; displayOrder: number }>;
}

export class PatchBlockConfigDto {
  config: any;
}

