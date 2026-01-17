import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';

/**
 * Create Workspace DTO
 *
 * Rules:
 * - name: Required workspace name
 * - slug: Optional workspace slug (auto-generated from name if not provided)
 * - ownerUserIds: Optional array of user IDs. If not provided, owner is derived from auth context (@CurrentUser)
 * - Backend derives owner from auth context - frontend must never send ownerId, organizationId, userId, etc.
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
   * Optional ownerUserIds array.
   * If not provided, backend will derive owner from @CurrentUser() auth context.
   * Each owner must be an org member with Member or Admin platform role.
   * Guest users cannot be owners.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one owner is required' })
  @IsUUID('4', { each: true, message: 'Each owner ID must be a valid UUID' })
  ownerUserIds?: string[];
}
