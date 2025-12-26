import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  defaultMethodology?: string;

  @IsOptional()
  isPrivate?: boolean = false;

  @IsOptional()
  ownerId?: string;
}
