import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CleanupTestWorkspacesDto {
  @IsBoolean()
  dryRun: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
