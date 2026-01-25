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
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * OrgInvite Entity
 *
 * Stores organization invitation tokens (hashed only, never raw).
 * Links an email address to an organization with a specific platform role.
 * Tokens expire after 7 days and are single-use.
 */
@Entity('org_invites')
@Index('IDX_ORG_INVITES_ORG_ID', ['organizationId'])
@Index('IDX_ORG_INVITES_EMAIL', ['email'])
@Index('IDX_ORG_INVITES_TOKEN_HASH', ['tokenHash'])
@Index('IDX_ORG_INVITES_ORG_EMAIL', ['organizationId', 'email'])
export class OrgInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  role: string; // 'admin' | 'member' | 'viewer'

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string; // SHA256 hash of raw token, never store raw token

  @Column({ name: 'invited_by_user_id', type: 'uuid', nullable: true })
  invitedByUserId: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations (optional, skip if circular imports)
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedBy?: User | null;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isAccepted(): boolean {
    return this.acceptedAt !== null;
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isActive(): boolean {
    return !this.isAccepted() && !this.isRevoked() && !this.isExpired();
  }
}
