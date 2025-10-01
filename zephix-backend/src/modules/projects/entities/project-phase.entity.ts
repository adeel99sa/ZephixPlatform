import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';

@Entity('project_phases')
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, project => project.phases, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum',
    enum: ['planning', 'development', 'testing', 'deployment', 'maintenance'],
    default: 'planning'
  })
  type: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ 
    type: 'enum',
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  })
  status: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'total_tasks', type: 'int', default: 0 })
  totalTasks: number;

  @Column({ name: 'completed_tasks', type: 'int', default: 0 })
  completedTasks: number;

  @Column({ name: 'progress_percentage', type: 'int', default: 0 })
  progressPercentage: number;

  @OneToMany(() => Task, task => task.phase)
  tasks: Task[];

  @Column({ type: 'jsonb', nullable: true })
  completionCriteria: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}