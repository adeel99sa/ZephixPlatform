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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
