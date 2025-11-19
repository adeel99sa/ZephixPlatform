import {
  IsOptional,
  IsArray,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class ResourceListQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
