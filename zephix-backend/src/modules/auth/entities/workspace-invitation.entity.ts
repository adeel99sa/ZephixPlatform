import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Workspace-scoped invitation issued by a workspace owner (or org admin via
 * override) to add an existing or new user directly to a workspace.
 *
 * Distinct from org-level invitations:
 * - `OrgInvite` (`modules/auth/entities/org-invite.entity.ts`) — org-level,
 *   may carry `OrgInviteWorkspaceAssignment` rows for at-acceptance workspace
 *   placement.
 * - `Invitation` (`organizations/entities/invitation.entity.ts`) — legacy,
 *   deprecated, do not extend (see debt log R5).
 *
 * Token mechanics: hashed at rest (HMAC-SHA256 via TokenHashUtil); raw token
 * sent only via the invitation email. Indexed lookup by `token_hash`.
 *
 * Lifetime: 7 days. Single-use via `accepted_at`. Re-issue creates a new row.
 *
 * Stored role values use the same vocabulary as `WorkspaceMember.role`
 * (`workspace_owner | workspace_admin | workspace_member | workspace_viewer`).
 */
@Entity('workspace_invitations')
@Index('IDX_workspace_invitations_email', ['email'])
@Index('IDX_workspace_invitations_workspace', ['workspaceId'])
@Index('IDX_workspace_invitations_token_hash', ['tokenHash'], { unique: true })
export class WorkspaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'invited_workspace_role', type: 'varchar', length: 64 })
  invitedWorkspaceRole: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  acceptedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invited_by' })
  invitedByUser: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accepted_by_user_id' })
  acceptedByUser: User | null;

  // Helpers
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isAccepted(): boolean {
    return this.acceptedAt !== null;
  }

  isPending(): boolean {
    return !this.isAccepted() && !this.isExpired();
  }
}
