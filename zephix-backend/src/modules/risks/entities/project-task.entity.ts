import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserProject } from './user-project.entity';

@Entity('project_tasks')
@Index(['projectId', 'status'])
@Index(['parentTaskId'])
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  parentTaskId: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedTo: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  actualHours: number;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'text', array: true, default: [] })
  dependencies: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => UserProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: UserProject;

  @ManyToOne(() => ProjectTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentTaskId' })
  parentTask: ProjectTask;
}
