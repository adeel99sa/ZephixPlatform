import { IsString, IsUUID, IsBoolean, IsObject, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CsvColumnMappingDto {
  @IsNumber()
  title: number;

  @IsOptional()
  @IsNumber()
  description?: number;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsNumber()
  assigneeEmail?: number;

  @IsOptional()
  @IsNumber()
  dueDate?: number;

  @IsOptional()
  @IsNumber()
  tags?: number;
}

export class ExecuteCsvDto {
  @IsUUID('4')
  projectId: string;

  @ValidateNested()
  @Type(() => CsvColumnMappingDto)
  mapping: CsvColumnMappingDto;

  @IsBoolean()
  dryRun: boolean;

  @IsString()
  fileToken: string;
}

export class SkippedRowDto {
  row: number;
  reason: string;
}

export class ExecuteCsvResponseDto {
  totalRows: number;
  importable: number;
  skipped: SkippedRowDto[];
  created: number;
  batchId: string;
}
