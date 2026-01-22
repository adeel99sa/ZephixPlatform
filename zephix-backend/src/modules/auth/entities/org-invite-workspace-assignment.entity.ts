/**
 * PROMPT 9: Org Invite Workspace Assignment Entity
 *
 * Links organization invites to workspace assignments
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrgInvite } from './org-invite.entity';
import { Workspace } from '../../../modules/workspaces/entities/workspace.entity';

@Entity('org_invite_workspace_assignments')
@Index('IDX_org_invite_workspace_assignments_invite', ['orgInviteId'])
@Index('IDX_org_invite_workspace_assignments_workspace', ['workspaceId'])
export class OrgInviteWorkspaceAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'org_invite_id' })
  orgInviteId: string;

  @ManyToOne(() => OrgInvite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_invite_id' })
  orgInvite: OrgInvite;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'text', name: 'requested_access_level' })
  requestedAccessLevel: 'member' | 'guest';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
