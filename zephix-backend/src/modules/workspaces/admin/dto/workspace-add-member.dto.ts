import { IsIn, IsUUID } from 'class-validator';

export class WorkspaceAddMemberDto {
  @IsUUID()
  userId!: string;

  @IsIn(['owner', 'member', 'viewer'])
  role!: 'owner' | 'member' | 'viewer';
}
