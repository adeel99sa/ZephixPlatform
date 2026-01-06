import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import { TeamVisibility } from '../../../shared/enums/team-visibility.enum';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9]+$/, { message: 'slug must be uppercase alphanumeric' })
  slug?: string;

  // Frontend sends shortCode, map to slug
  shortCode?: string;

  // Frontend sends status, map to isArchived
  status?: 'active' | 'archived';

  @IsOptional()
  @IsString()
  @Length(0, 7)
  color?: string;

  @IsOptional()
  @IsEnum(TeamVisibility)
  visibility?: TeamVisibility;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

