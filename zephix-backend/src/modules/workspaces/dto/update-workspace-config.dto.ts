import { IsInt, IsString, IsBoolean, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class UpdateWorkspaceConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxDepth?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level0Label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level1Label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level2Label?: string;

  @IsOptional()
  @IsBoolean()
  allowProjectsAtAllLevels?: boolean;
}
