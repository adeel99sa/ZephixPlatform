import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

/**
 * Password Reset Entity
 *
 * Stores password reset tokens with enhanced security:
 * - Hashed tokens (never store plain text)
 * - 30-minute TTL (OWASP recommended)
 * - Single-use tokens
 * - IP address and user agent tracking
 * - Automatic cleanup of expired tokens
 */
@Entity('password_resets')
@Index(['tokenHash'], { unique: true })
@Index(['userId', 'isUsed'])
@Index(['expiresAt'])
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    length: 64,
    comment: 'SHA-256 hash of the reset token (never store plain text)',
  })
  @Index()
  tokenHash: string;

  @Column({
    type: 'timestamp',
    comment: 'Token expiration time (30 minutes from creation)',
  })
  @Index()
  expiresAt: Date;

  @Column({
    default: false,
    comment: 'Whether this token has been used (single-use tokens)',
  })
  @Index()
  isUsed: boolean;

  @Column({
    type: 'inet',
    nullable: true,
    comment: 'IP address where reset was requested',
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent string for security tracking',
  })
  userAgent?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When the token was actually used',
  })
  usedAt?: Date;

  @Column({
    type: 'inet',
    nullable: true,
    comment: 'IP address where token was used',
  })
  usedFromIp?: string;

  @CreateDateColumn({
    comment: 'When the reset request was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    comment: 'When the record was last updated',
  })
  updatedAt: Date;

  /**
   * Security method to check if token is valid
   */
  isValid(): boolean {
    return !this.isUsed && new Date() < this.expiresAt;
  }

  /**
   * Security method to mark token as used
   */
  markAsUsed(ipAddress?: string): void {
    this.isUsed = true;
    this.usedAt = new Date();
    if (ipAddress) {
      this.usedFromIp = ipAddress;
    }
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }
}
