import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity';
import { ProjectPhase } from './project-phase.entity';
import { TaskDependency } from './task-dependency.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, project => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'phase_id', nullable: true })
  phaseId?: string;

  @ManyToOne(() => ProjectPhase, phase => phase.tasks)
  @JoinColumn({ name: 'phase_id' })
  phase?: ProjectPhase;

  @Column({ name: 'parent_task_id', nullable: true })
  parentTaskId?: string;

  @ManyToOne(() => Task, task => task.subtasks)
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: Task;

  @OneToMany(() => Task, task => task.parentTask)
  subtasks: Task[];

  @Column({ name: 'task_number' })
  taskNumber: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'task_type', default: 'task' })
  taskType: 'task' | 'milestone' | 'deliverable';

  @Column({ default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo?: string;

  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: User;

  @Column({ name: 'assignment_type', default: 'internal' })
  assignmentType: 'internal' | 'vendor';

  @Column({ name: 'vendor_name', nullable: true })
  vendorName?: string;

  @Column({ name: 'estimated_hours', default: 0 })
  estimatedHours: number;

  @Column({ name: 'actual_hours', default: 0 })
  actualHours: number;

  @Column({ type: 'date', name: 'planned_start_date', nullable: true })
  plannedStartDate?: Date;

  @Column({ type: 'date', name: 'planned_end_date', nullable: true })
  plannedEndDate?: Date;

  @Column({ type: 'date', name: 'actual_start_date', nullable: true })
  actualStartDate?: Date;

  @Column({ type: 'date', name: 'actual_end_date', nullable: true })
  actualEndDate?: Date;

  @Column({ default: 'not_started' })
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'on_hold';

  @Column({ name: 'progress_percentage', default: 0 })
  progressPercentage: number;

  @Column({ name: 'is_milestone', default: false })
  isMilestone: boolean;

  @Column({ name: 'is_blocked', default: false })
  isBlocked: boolean;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason?: string;

  @OneToMany(() => TaskDependency, dependency => dependency.task)
  dependencies: TaskDependency[];

  @OneToMany(() => TaskDependency, dependency => dependency.dependsOnTask)
  dependentTasks: TaskDependency[];

  @Column({ name: 'created_by', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
