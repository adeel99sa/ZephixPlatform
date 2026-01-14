import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkPhase } from './work-phase.entity';
import { TaskStatus, TaskPriority, TaskType } from '../enums/task.enums';

@Entity('work_tasks')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['parentTaskId'])
@Index(['phaseId'])
@Index(['assigneeUserId'])
@Index(['reporterUserId'])
@Index(['rank'])
@Index(['workspaceId', 'phaseId', 'rank'], { where: '"phase_id" IS NOT NULL' })
export class WorkTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'parent_task_id', nullable: true })
  parentTaskId: string | null;

  @Column({ type: 'uuid', name: 'phase_id', nullable: true })
  phaseId: string | null;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.TASK,
  })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'uuid', name: 'assignee_user_id', nullable: true })
  assigneeUserId: string | null;

  @Column({ type: 'uuid', name: 'reporter_user_id', nullable: true })
  reporterUserId: string | null;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'numeric', nullable: true })
  rank: number | null;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => WorkTask, (task) => task.subtasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: WorkTask | null;

  @OneToMany(() => WorkTask, (task) => task.parentTask)
  subtasks: WorkTask[];

  @ManyToOne(() => WorkPhase, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'phase_id' })
  phase: WorkPhase | null;
}
