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

export enum FeedbackType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  USABILITY = 'usability',
  GENERAL = 'general',
}

export enum FeedbackStatus {
  NEW = 'new',
  REVIEWING = 'reviewing',
  ACKNOWLEDGED = 'acknowledged',
  IMPLEMENTED = 'implemented',
  CLOSED = 'closed',
}

@Entity('feedback')
@Index('IDX_FEEDBACK_TYPE', ['type'])
@Index('IDX_FEEDBACK_STATUS', ['status'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.GENERAL,
  })
  type: FeedbackType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  context: string;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.NEW,
  })
  status: FeedbackStatus;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
} 