import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PresenceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

@Entity('user_presence')
export class UserPresence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: PresenceStatus,
    default: PresenceStatus.OFFLINE,
  })
  status: PresenceStatus;

  @Column({ nullable: true })
  socketId: string;

  @Column({ nullable: true })
  lastSeen: Date;

  @Column({ nullable: true })
  currentProjectId: string;

  @Column({ nullable: true })
  currentTaskId: string;

  @Column({ default: false })
  isTyping: boolean;

  @Column({ nullable: true })
  typingIn: string; // projectId or taskId

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
