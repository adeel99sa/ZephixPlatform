import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('task_dependencies')
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, task => task.dependencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'dependency_type' })
  dependencyType: 'quick_text' | 'internal_task' | 'external' | 'vendor' | 'approval' | 'milestone';

  @Column({ name: 'depends_on_task_id', nullable: true })
  dependsOnTaskId?: string;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'depends_on_task_id' })
  dependsOnTask?: Task;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'relationship_type', default: 'blocks' })
  relationshipType: 'blocks' | 'blocked_by' | 'related_to';

  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate?: Date;

  @Column({ name: 'lead_lag_days', default: 0 })
  leadLagDays: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'ready' | 'completed' | 'blocked';

  @Column({ name: 'external_url', type: 'text', nullable: true })
  externalUrl?: string;

  @Column({ name: 'external_system', nullable: true })
  externalSystem?: string;

  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @Column({ name: 'vendor_name', nullable: true })
  vendorName?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'completed_by', nullable: true })
  completedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completedByUser?: User;
}