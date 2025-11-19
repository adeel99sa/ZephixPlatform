import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @Length(2, 120)
  @IsOptional()
  name?: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @Length(2, 120)
  @IsOptional()
  slug?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
