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

export type WorkspaceRole = 'owner' | 'member' | 'viewer';

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
}
