import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListTeamsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['active', 'archived'])
  status?: 'active' | 'archived';

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
