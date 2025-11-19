import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
// import { ProjectPhase } from '../../projects/entities/project-phase.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // @Column({ name: 'phase_id', nullable: true })
  // phaseId: string;

  // @ManyToOne(() => ProjectPhase)
  // @JoinColumn({ name: 'phase_id' })
  // phase: ProjectPhase;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'title' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ type: 'text', default: 'pending' })
  status: string;

  @Column({ name: 'progress_percentage', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'estimated_hours', type: 'int', default: 0 })
  estimatedHours: number;

  @Column({ name: 'actual_hours', type: 'int', default: 0 })
  actualHours: number;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'medium', nullable: true })
  priority: string;

  @Column({ type: 'jsonb', nullable: true })
  dependencies: string[];

  // Additional columns from database
  @Column({ name: 'task_number', type: 'varchar', length: 20 })
  taskNumber: string;

  @Column({ name: 'task_type', type: 'varchar', length: 50, default: 'task' })
  taskType: string;

  @Column({ name: 'actual_start_date', type: 'date', nullable: true })
  actualStartDate: Date;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate: Date;

  @Column({ name: 'is_milestone', type: 'boolean', default: false })
  isMilestone: boolean;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason: string;

  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({
    name: 'assignment_type',
    type: 'varchar',
    length: 20,
    default: 'internal',
  })
  assignmentType: string;

  @Column({ name: 'vendor_name', type: 'varchar', length: 255, nullable: true })
  vendorName: string;

  @Column({ name: 'resource_impact_score', type: 'integer', nullable: true })
  resourceImpactScore: number;

  @Column({ name: 'assigned_resources', type: 'text', nullable: true })
  assignedResources: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
