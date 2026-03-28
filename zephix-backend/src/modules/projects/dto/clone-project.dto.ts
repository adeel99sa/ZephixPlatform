import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProjectCloneMode } from '../enums/project-clone.enums';

export class CloneProjectDto {
  @IsEnum(ProjectCloneMode, {
    message: 'mode must be structure_only or full_clone',
  })
  mode: ProjectCloneMode;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  newName?: string;

  @IsOptional()
  @IsUUID()
  targetWorkspaceId?: string;
}
