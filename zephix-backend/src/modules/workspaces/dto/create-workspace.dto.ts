import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @Length(2, 120)
  slug!: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean = false;

  @IsUUID()
  @IsOptional()
  ownerId?: string;
}
