import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';

/**
 * PROMPT 6: Create Workspace DTO
 *
 * Rules:
 * - ownerUserIds: Array of user IDs, minimum 1, all must be org members with Member or Admin platform role
 * - Guest users cannot be owners
 */
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

  /**
   * PROMPT 6: ownerUserIds array - minimum 1 owner required
   * Each owner must be an org member with Member or Admin platform role
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one owner is required' })
  @IsUUID('4', { each: true, message: 'Each owner ID must be a valid UUID' })
  ownerUserIds!: string[];
}
