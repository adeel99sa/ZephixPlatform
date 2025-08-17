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

@Entity('email_verifications')
@Index('IDX_EMAIL_VERIFICATION_TOKEN', ['token'], { unique: true })
@Index('IDX_EMAIL_VERIFICATION_USER', ['userId'])
@Index('IDX_EMAIL_VERIFICATION_EXPIRES', ['expiresAt'])
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

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

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

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
