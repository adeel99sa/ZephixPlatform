import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';

@Entity('project_phases')
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })  // FIX: Add proper mapping
  projectId: string;

  @ManyToOne(() => Project, project => project.phases)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'phase_name', nullable: true })  // FIX: nullable since some records might not have it
  phaseName: string;

  @Column({ name: 'phase_description', nullable: true })  // ADD: Missing from entity
  phaseDescription?: string;

  @Column({ name: 'order_index', nullable: true })  // FIX: Add nullable
  orderIndex: number;

  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  @Column({ default: 'not_started' })
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

  @Column({ name: 'actual_start_date', type: 'date', nullable: true })  // ADD: Missing
  actualStartDate?: Date;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })  // ADD: Missing
  actualEndDate?: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })  // ADD: Missing
  budget?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'actual_cost' })  // ADD: Missing
  actualCost?: number;

  @Column({ name: 'is_milestone', default: false })  // ADD: Missing
  isMilestone: boolean;

  @Column({ name: 'owner_id', nullable: true })  // ADD: Missing
  ownerId?: string;

  @Column({ name: 'predecessor_phase_id', nullable: true })  // ADD: Missing
  predecessorPhaseId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Task, task => task.phase)
  tasks: Task[];

  @Column({ name: 'total_tasks', default: 0 })
  totalTasks: number;

  @Column({ name: 'completed_tasks', default: 0 })
  completedTasks: number;

  @Column({ name: 'progress_percentage', default: 0 })
  progressPercentage: number;
}