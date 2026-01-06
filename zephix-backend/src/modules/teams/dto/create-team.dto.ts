import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { TeamVisibility } from '../../../shared/enums/team-visibility.enum';

export class CreateTeamDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9]+$/, { message: 'slug must be uppercase alphanumeric' })
  slug?: string;

  // Frontend sends shortCode, map to slug
  shortCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 7)
  color?: string;

  @IsEnum(TeamVisibility)
  visibility: TeamVisibility;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

