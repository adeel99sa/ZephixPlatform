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
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('auth_sessions')
@Index('IDX_auth_sessions_user', ['userId', 'lastSeenAt'])
@Index('IDX_auth_sessions_organization', ['organizationId', 'createdAt'])
@Index('IDX_auth_sessions_token_hash', ['currentRefreshTokenHash'])
@Index(
  'IDX_auth_sessions_refresh_token_hash_unique',
  ['currentRefreshTokenHash'],
  { unique: true, where: '"current_refresh_token_hash" IS NOT NULL' },
)
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'now()' })
  lastSeenAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoke_reason', type: 'text', nullable: true })
  revokeReason: string | null;

  @Column({
    name: 'current_refresh_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  currentRefreshTokenHash: string | null;

  @Column({ name: 'refresh_expires_at', type: 'timestamptz', nullable: true })
  refreshExpiresAt: Date | null;

  @Column({
    name: 'last_active_organization_id',
    type: 'uuid',
    nullable: true,
  })
  lastActiveOrganizationId: string | null;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_active_organization_id' })
  lastActiveOrganization: Organization | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(): boolean {
    if (!this.refreshExpiresAt) {
      return false;
    }
    return new Date() > this.refreshExpiresAt;
  }

  isActive(): boolean {
    return !this.isRevoked() && !this.isExpired();
  }
}
