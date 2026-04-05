import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../../users/entities/user.entity';

@Entity('notification_reads')
@Unique(['notificationId', 'userId'])
@Index('IDX_notification_reads_user', ['userId', 'readAt'])
export class NotificationRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Null until the user marks the notification read (row may exist earlier for dismiss/flag). */
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt: Date | null;

  @Column({ name: 'flagged_at', type: 'timestamptz', nullable: true })
  flaggedAt: Date | null;

  // Relations
  @ManyToOne(() => Notification, (notification) => notification.reads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
