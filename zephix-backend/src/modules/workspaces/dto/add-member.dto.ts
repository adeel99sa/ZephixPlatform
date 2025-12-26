import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace.entity';

export class AddMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['workspace_owner', 'workspace_member', 'workspace_viewer'], {
    message:
      'Role must be "workspace_owner", "workspace_member", or "workspace_viewer".',
  })
  @IsNotEmpty()
  role: WorkspaceRole;
}
