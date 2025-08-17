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
import { Organization } from './organization.entity';
import { User } from '../../modules/users/entities/user.entity';

@Entity('invitations')
@Index('IDX_INVITATION_TOKEN', ['token'], { unique: true })
@Index('IDX_INVITATION_EMAIL_ORG', ['email', 'organizationId'])
@Index('IDX_INVITATION_STATUS', ['status'])
@Index('IDX_INVITATION_EXPIRES', ['expiresAt'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'pm', 'viewer'],
  })
  role: 'admin' | 'pm' | 'viewer';

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  invitedByUserId: string;

  @Column('uuid', { nullable: true })
  acceptedByUserId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedByUserId' })
  invitedBy: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acceptedByUserId' })
  acceptedBy?: User;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === 'pending' && !this.isExpired();
  }

  canBeAccepted(): boolean {
    return this.isPending();
  }

  canBeResent(): boolean {
    return this.status === 'pending' || this.status === 'expired';
  }
}
