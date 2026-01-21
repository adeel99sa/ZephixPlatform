import { IsIn } from 'class-validator';

export class WorkspaceUpdateMemberDto {
  @IsIn(['owner', 'member', 'viewer'])
  role!: 'owner' | 'member' | 'viewer';
}
