import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertKpiValueDto {
  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export type ProjectKpiDto = {
  id: string;
  projectId: string;
  kpiKey: string;
  name: string;
  category: string;
  unit?: string | null;
  target?: any | null;
  latestValue?: number | null;
  latestAsOfDate?: string | null;
};
