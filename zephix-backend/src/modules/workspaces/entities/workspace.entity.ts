import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { WorkspaceMember } from './workspace-member.entity';

// Workspace roles - Phase 1: Updated to use workspace_ prefix for clarity
// workspace_owner: Full control over workspace, can manage members
// workspace_member: Can create projects and content, cannot manage members
// workspace_viewer: Read-only access to workspace content
export type WorkspaceRole =
  | 'workspace_owner'
  | 'workspace_member'
  | 'workspace_viewer';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column('uuid', { name: 'organization_id' }) organizationId!: string;

  @Column({ length: 100 }) name!: string;
  @Column({ length: 50, nullable: true }) slug?: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ name: 'is_private', type: 'boolean', default: false })
  isPrivate!: boolean;

  @Column('uuid', { name: 'created_by' }) createdBy!: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true }) ownerId?:
    | string
    | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => WorkspaceMember, (m) => m.workspace)
  members?: WorkspaceMember[];

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;

  // ✅ First-class soft-delete with TypeORM
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Column('uuid', { name: 'deleted_by', nullable: true }) deletedBy?:
    | string
    | null;

  // Phase 3: Workspace permissions configuration
  // Stores a JSON matrix defining which roles can perform which actions
  // Example: { "view_workspace": ["owner", "admin", "member", "viewer"], ... }
  @Column({ type: 'jsonb', name: 'permissions_config', nullable: true })
  permissionsConfig?: Record<string, string[]> | null;

  // Phase 3: Default methodology for this workspace
  @Column({
    type: 'varchar',
    length: 50,
    name: 'default_methodology',
    nullable: true,
  })
  defaultMethodology?: string | null;
}
