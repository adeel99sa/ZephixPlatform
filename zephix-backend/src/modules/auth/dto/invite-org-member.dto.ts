import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WorkspaceAssignmentDto {
  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsIn([
    'workspace_owner',
    'workspace_admin',
    'workspace_member',
    'workspace_viewer',
  ])
  role: string;
}

export class InviteOrgMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  /**
   * Org role at acceptance time. ADMIN promotion via this endpoint is allowed
   * for org-admin callers — the controller checks the caller is admin via
   * RequireOrgRole(ADMIN) before reaching here.
   */
  @IsString()
  @IsIn(['MEMBER', 'VIEWER', 'ADMIN'])
  orgRole: 'MEMBER' | 'VIEWER' | 'ADMIN';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceAssignmentDto)
  workspaceAssignments?: WorkspaceAssignmentDto[];
}

export class ChangeOrgRoleDto {
  @IsString()
  @IsIn(['ADMIN', 'MEMBER', 'VIEWER'])
  orgRole: 'ADMIN' | 'MEMBER' | 'VIEWER';
}
