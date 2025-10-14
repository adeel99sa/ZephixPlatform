import {
  IsUUID,
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  IsDateString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePhaseDto {
  @IsUUID() @IsOptional() projectId?: string;
  @IsString() @Length(1, 160) name!: string;
  @IsIn(['not-started', 'in-progress', 'blocked', 'done'])
  @IsOptional()
  status?: string;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() order?: number;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsUUID() @IsOptional() ownerUserId?: string;
}

export class UpdatePhaseDto {
  @IsString() @Length(1, 160) @IsOptional() name?: string;
  @IsIn(['not-started', 'in-progress', 'blocked', 'done'])
  @IsOptional()
  status?: string;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() order?: number;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsUUID() @IsOptional() ownerUserId?: string;
}

export class ReorderPhasesDto {
  // array of { id, order }
  @Type(() => Object)
  updates!: Array<{ id: string; order: number }>;
}
