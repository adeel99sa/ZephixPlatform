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
import { WorkTask } from './work-task.entity';

@Entity('task_comments')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['taskId'])
@Index(['createdByUserId'])
@Index(['updatedByUserId'])
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @Column({ type: 'uuid', name: 'updated_by_user_id', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => WorkTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: WorkTask;
}
