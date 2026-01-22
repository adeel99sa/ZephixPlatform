import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { User } from '../../users/entities/user.entity';
import { WorkspaceRole } from './workspace.entity';

@Entity('workspace_members')
@Index('UX_wm_ws_user', ['workspaceId', 'userId'], { unique: true })
@Index('IDX_wm_workspace_id', ['workspaceId'])
@Index('IDX_wm_user_id', ['userId'])
@Index('IDX_wm_role', ['role'])
export class WorkspaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (w) => w.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  role: WorkspaceRole;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string | null;

  // PROMPT 8: Member status
  @Column({ type: 'text', default: 'active' })
  status: 'active' | 'suspended';

  @Column({ type: 'timestamptz', name: 'suspended_at', nullable: true })
  suspendedAt?: Date | null;

  @Column({ type: 'uuid', name: 'suspended_by_user_id', nullable: true })
  suspendedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'suspended_by_user_id' })
  suspendedBy?: User;

  @Column({ type: 'timestamptz', name: 'reinstated_at', nullable: true })
  reinstatedAt?: Date | null;

  @Column({ type: 'uuid', name: 'reinstated_by_user_id', nullable: true })
  reinstatedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reinstated_by_user_id' })
  reinstatedBy?: User;
}
