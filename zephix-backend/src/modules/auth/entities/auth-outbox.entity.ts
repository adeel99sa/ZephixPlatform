import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * AuthOutbox Entity
 *
 * Stores email delivery events for reliable processing with retries.
 * Implements outbox pattern for eventual consistency.
 */
@Entity('auth_outbox')
@Index('IDX_AUTH_OUTBOX_STATUS', ['status'])
@Index('IDX_AUTH_OUTBOX_NEXT_ATTEMPT', ['nextAttemptAt'])
@Index('IDX_AUTH_OUTBOX_TYPE', ['type'])
export class AuthOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  type: string; // e.g., 'auth.email_verification.requested', 'auth.invite.created'

  @Column({ name: 'payload_json', type: 'jsonb' })
  payloadJson: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamp', nullable: true })
  nextAttemptAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'claimed_at', type: 'timestamp', nullable: true })
  claimedAt: Date | null;

  @Column({ name: 'processing_started_at', type: 'timestamp', nullable: true })
  processingStartedAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  // Helper methods
  shouldRetry(maxAttempts: number = 3): boolean {
    return (
      this.status === 'failed' &&
      this.attempts < maxAttempts &&
      (this.nextAttemptAt === null || new Date() >= this.nextAttemptAt)
    );
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }
}
