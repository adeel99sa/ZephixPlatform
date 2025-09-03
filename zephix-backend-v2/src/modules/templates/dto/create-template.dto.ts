import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsEnum, IsUUID } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsEnum(['waterfall', 'scrum', 'agile', 'kanban'])
  methodology: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  structure?: any;

  @IsOptional()
  @IsArray()
  metrics?: any[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_system?: boolean;

  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  phases?: CreateTemplatePhaseDto[];
}

export class CreateTemplatePhaseDto {
  @IsString()
  name: string;

  @IsOptional()
  order_index?: number;

  @IsOptional()
  @IsObject()
  gate_requirements?: any;

  @IsOptional()
  duration_days?: number;
}
