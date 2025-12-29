import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

/**
 * OrgInvite Entity
 *
 * Stores organization invitation tokens (hashed only).
 * Links an email address to an organization with a specific role.
 * Tokens expire and are single-use.
 */
@Entity('org_invites')
@Index('IDX_ORG_INVITES_TOKEN_HASH', ['tokenHash'], { unique: true })
@Index('IDX_ORG_INVITES_ORG_ID', ['orgId'])
@Index('IDX_ORG_INVITES_EMAIL', ['email'])
export class OrgInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, default: 'viewer' })
  role: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true }) // HMAC-SHA256 hex = 64 chars
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isAccepted(): boolean {
    return this.acceptedAt !== null;
  }

  isValid(): boolean {
    return !this.isAccepted() && !this.isExpired();
  }
}

