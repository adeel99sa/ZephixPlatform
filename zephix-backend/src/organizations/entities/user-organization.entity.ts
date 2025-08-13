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
import { User } from "../../modules/users/entities/user.entity"
import { Organization } from './organization.entity';

@Entity('user_organizations')
@Index('IDX_USER_ORG_USER_ID', ['userId'])
@Index('IDX_USER_ORG_ORG_ID', ['organizationId'])
@Index('IDX_USER_ORG_ACTIVE', ['isActive'])
@Index('IDX_USER_ORG_ROLE', ['role'])
export class UserOrganization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  organizationId: string;

  @Column({
    type: 'enum',
    enum: ['owner', 'admin', 'pm', 'viewer'],
    default: 'viewer',
  })
  role: 'owner' | 'admin' | 'pm' | 'viewer';

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  @Column({ type: 'date', nullable: true })
  joinedAt: Date;

  @Column({ type: 'date', nullable: true })
  lastAccessAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, (org) => org.userOrganizations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Helper methods
  isOwner(): boolean {
    return this.role === 'owner';
  }

  isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'owner';
  }

  canManageProjects(): boolean {
    return ['owner', 'admin', 'pm'].includes(this.role);
  }

  canViewOnly(): boolean {
    return this.role === 'viewer';
  }
}
