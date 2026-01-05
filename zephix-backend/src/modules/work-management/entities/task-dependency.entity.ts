import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { WorkTask } from './work-task.entity';
import { DependencyType } from '../enums/task.enums';

@Entity('task_dependencies')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['predecessorTaskId'])
@Index(['successorTaskId'])
@Index(['createdByUserId'])
@Unique(['workspaceId', 'predecessorTaskId', 'successorTaskId', 'type'])
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'predecessor_task_id' })
  predecessorTaskId: string;

  @Column({ type: 'uuid', name: 'successor_task_id' })
  successorTaskId: string;

  @Column({
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.FINISH_TO_START,
  })
  type: DependencyType;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => WorkTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'predecessor_task_id' })
  predecessorTask: WorkTask;

  @ManyToOne(() => WorkTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'successor_task_id' })
  successorTask: WorkTask;
}

