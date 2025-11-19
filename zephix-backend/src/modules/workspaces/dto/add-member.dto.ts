import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace.entity';

export class AddMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['member', 'viewer'], {
    message:
      'Role must be "member" or "viewer". Use change-owner endpoint to assign owner role.',
  })
  @IsNotEmpty()
  role: 'member' | 'viewer';
}
