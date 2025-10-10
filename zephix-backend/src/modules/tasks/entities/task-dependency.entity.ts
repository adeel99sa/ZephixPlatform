import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('simple_task_dependencies')
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'predecessor_id' })
  predecessorId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'predecessor_id' })
  predecessor: Task;

  @Column({ name: 'successor_id' })
  successorId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'successor_id' })
  successor: Task;

  @Column({ name: 'type', default: 'finish-to-start' })
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';

  @Column({ name: 'task_id' })
  taskId: string;

  @Column({ name: 'depends_on_task_id' })
  dependsOnTaskId: string;

  @Column({ name: 'lead_lag_days', type: 'int', default: 0 })
  leadLagDays: number;

  @Column({ name: 'dependency_type', type: 'varchar', length: 50, default: 'finish-to-start' })
  dependencyType: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'relationship_type', type: 'varchar', length: 50, default: 'blocks' })
  relationshipType: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
