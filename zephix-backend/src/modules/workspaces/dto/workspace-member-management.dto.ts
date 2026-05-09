import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const WORKSPACE_ROLE_VALUES = [
  'workspace_owner',
  'workspace_admin',
  'workspace_member',
  'workspace_viewer',
] as const;
export type WorkspaceMemberRole = (typeof WORKSPACE_ROLE_VALUES)[number];

export class InviteWorkspaceMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(WORKSPACE_ROLE_VALUES as unknown as string[])
  workspaceRole: WorkspaceMemberRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;
}

export class ChangeWorkspaceRoleDto {
  @IsString()
  @IsIn(WORKSPACE_ROLE_VALUES as unknown as string[])
  workspaceRole: WorkspaceMemberRole;
}
