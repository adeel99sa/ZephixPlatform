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
import { Iteration } from './iteration.entity';
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
// Composite indexes for list queries (tenancy + filtering + sorting)
@Index(['workspaceId', 'projectId', 'status', 'updatedAt'])
@Index(['workspaceId', 'assigneeUserId', 'status'], {
  where: '"assignee_user_id" IS NOT NULL',
})
@Index(['workspaceId', 'status', 'dueDate'], {
  where: '"due_date" IS NOT NULL',
})
// Phase 2H: Board view column ordering
@Index(['projectId', 'status', 'rank'])
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

  // ── Phase 2B: Waterfall schedule fields ─────────────────────────────
  @Column({ type: 'timestamptz', name: 'planned_start_at', nullable: true })
  plannedStartAt: Date | null;

  @Column({ type: 'timestamptz', name: 'planned_end_at', nullable: true })
  plannedEndAt: Date | null;

  @Column({ type: 'timestamptz', name: 'actual_start_at', nullable: true })
  actualStartAt: Date | null;

  @Column({ type: 'timestamptz', name: 'actual_end_at', nullable: true })
  actualEndAt: Date | null;

  @Column({ type: 'integer', name: 'percent_complete', default: 0 })
  percentComplete: number;

  @Column({ type: 'boolean', name: 'is_milestone', default: false })
  isMilestone: boolean;

  @Column({ type: 'varchar', length: 30, name: 'constraint_type', default: 'asap' })
  constraintType: string;

  @Column({ type: 'timestamptz', name: 'constraint_date', nullable: true })
  constraintDate: Date | null;

  @Column({ type: 'varchar', length: 50, name: 'wbs_code', nullable: true })
  wbsCode: string | null;

  // ── Estimation fields ────────────────────────────────────────────────
  @Column({ type: 'integer', name: 'estimate_points', nullable: true })
  estimatePoints: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'estimate_hours',
    nullable: true,
  })
  estimateHours: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'remaining_hours',
    nullable: true,
  })
  remainingHours: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'actual_hours',
    nullable: true,
  })
  actualHours: number | null;

  // ── Iteration fields ─────────────────────────────────────────────────
  @Column({ type: 'uuid', name: 'iteration_id', nullable: true })
  iterationId: string | null;

  @Column({ type: 'boolean', default: false })
  committed: boolean;

  @Column({ type: 'numeric', nullable: true })
  rank: number | null;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /** Ordered list of acceptance criteria items: { text: string; done: boolean }[] */
  @Column({ type: 'jsonb', name: 'acceptance_criteria', nullable: true })
  acceptanceCriteria: Array<{ text: string; done: boolean }> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'uuid', name: 'deleted_by_user_id', nullable: true })
  deletedByUserId: string | null;

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

  @ManyToOne(() => Iteration, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'iteration_id' })
  iteration: Iteration | null;
}
