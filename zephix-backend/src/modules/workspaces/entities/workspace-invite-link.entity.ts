/**
 * PROMPT 7: Workspace Invite Link Entity
 *
 * Stores invite links for workspaces.
 * Token is stored hashed, never raw.
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
import { Workspace } from './workspace.entity';
import { User } from '../../users/entities/user.entity';

export type InviteLinkStatus = 'active' | 'revoked';

@Entity('workspace_invite_links')
@Index('IDX_workspace_invite_links_workspace', ['workspaceId'])
@Index('IDX_workspace_invite_links_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_workspace_invite_links_status', ['status'])
export class WorkspaceInviteLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'text', name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({
    type: 'text',
    default: 'active',
  })
  status: InviteLinkStatus;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;
}
