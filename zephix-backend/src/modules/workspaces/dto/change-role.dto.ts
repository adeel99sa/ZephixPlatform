import { IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace.entity';

export class ChangeRoleDto {
  @IsEnum(['owner', 'member', 'viewer'], {
    message: 'Role must be "owner", "member", or "viewer"',
  })
  @IsNotEmpty()
  role: WorkspaceRole;
}
