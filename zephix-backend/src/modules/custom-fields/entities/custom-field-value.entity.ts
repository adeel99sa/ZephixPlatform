import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkTask } from '../../work-management/entities/work-task.entity';

@Entity({ name: 'custom_field_values' })
@Index(['workTaskId', 'fieldDefinitionId'], { unique: true })
export class CustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ name: 'work_task_id', type: 'uuid' })
  workTaskId!: string;

  @ManyToOne(() => WorkTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_task_id' })
  workTask!: WorkTask;

  @Column({ type: 'uuid' })
  fieldDefinitionId!: string;

  @Column({ type: 'jsonb' })
  value!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
