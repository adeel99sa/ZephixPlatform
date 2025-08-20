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
import { User } from '../../modules/users/entities/user.entity';

/**
 * Email Verification Entity
 *
 * Enhanced security implementation following OWASP ASVS Level 1:
 * - Hashed tokens (never store plain text)
 * - 30-minute TTL (OWASP recommended)
 * - Single-use tokens with status tracking
 * - IP address and user agent logging
 * - Automatic cleanup of expired tokens
 */
@Entity('email_verifications')
@Index('IDX_EMAIL_VERIFICATION_TOKEN_HASH', ['tokenHash'], { unique: true })
@Index('IDX_EMAIL_VERIFICATION_USER', ['userId'])
@Index('IDX_EMAIL_VERIFICATION_EXPIRES', ['expiresAt'])
@Index('IDX_EMAIL_VERIFICATION_STATUS', ['status'])
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
    length: 64,
    comment: 'SHA-256 hash of the verification token (never store plain text)',
  })
  tokenHash: string;

  @Column()
  email: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'verified', 'expired'],
    default: 'pending',
  })
  status: 'pending' | 'verified' | 'expired';

  @Column({
    type: 'timestamp',
    comment: 'Token expiration time (30 minutes from creation for security)',
  })
  expiresAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When the email was actually verified',
  })
  verifiedAt: Date;

  @Column({
    type: 'inet',
    nullable: true,
    comment: 'IP address where verification was requested',
  })
  ipAddress: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent string for security tracking',
  })
  userAgent: string;

  @Column({
    type: 'inet',
    nullable: true,
    comment: 'IP address where verification was completed',
  })
  verifiedFromIp: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return this.status === 'pending' && !this.isExpired();
  }

  canBeResent(): boolean {
    return this.status === 'pending' || this.status === 'expired';
  }
}
