import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsUUID,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { WorkspaceVisibility } from '../entities/workspace.entity';

/**
 * Create Workspace DTO
 *
 * Rules:
 * - name: Required workspace name (max 120 chars)
 * - slug: Optional — backend auto-generates from name when missing, ensures uniqueness
 * - description: Optional workspace description (max 500 chars)
 * - visibility: Optional — OPEN (default) or CLOSED. Maps to isPrivate internally.
 * - ownerUserIds: Optional array of user IDs. If not provided, owner is derived from auth context (@CurrentUser)
 * - Backend derives owner from auth context - frontend must never send ownerId, organizationId, userId, etc.
 */
export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(WorkspaceVisibility)
  visibility?: WorkspaceVisibility;

  @IsOptional()
  @IsString()
  defaultMethodology?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessUnitLabel?: string;

  @IsOptional()
  @IsUUID('4')
  defaultTemplateId?: string;

  @IsOptional()
  @IsBoolean()
  inheritOrgDefaultTemplate?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['ORG_DEFAULT', 'WORKSPACE_OVERRIDE'])
  governanceInheritanceMode?: 'ORG_DEFAULT' | 'WORKSPACE_OVERRIDE';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each template ID must be a valid UUID' })
  allowedTemplateIds?: string[];

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

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
