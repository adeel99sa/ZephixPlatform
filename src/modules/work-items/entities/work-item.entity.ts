import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Check } from 'typeorm';

@Entity('work_items')
@Index('idx_work_items_project', ['projectId'])
@Index('idx_work_items_assigned', ['assignedTo'])
@Index('idx_work_items_status', ['status'])
@Check(`type IN ('task', 'story', 'bug', 'epic')`)
@Check(`status IN ('todo', 'in_progress', 'done', 'blocked')`)
@Check(`priority IN ('low', 'medium', 'high', 'critical')`)
export class WorkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'projectId' })
  projectId: string;

  @Column({ 
    length: 50,
    type: 'varchar'
  })
  type: 'task' | 'story' | 'bug' | 'epic';

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    length: 20,
    default: 'todo'
  })
  status: 'todo' | 'in_progress' | 'done' | 'blocked';

  @Column({ name: 'phaseOrSprint', length: 100, nullable: true })
  phaseOrSprint: string;

  @Column({ name: 'assignedTo', nullable: true })
  assignedTo: string;

  @Column({ name: 'plannedStart', type: 'date', nullable: true })
  plannedStart: Date;

  @Column({ name: 'plannedEnd', type: 'date', nullable: true })
  plannedEnd: Date;

  @Column({ name: 'actualStart', type: 'date', nullable: true })
  actualStart: Date;

  @Column({ name: 'actualEnd', type: 'date', nullable: true })
  actualEnd: Date;

  @Column({ name: 'effortPoints', nullable: true })
  effortPoints: number;

  @Column({ 
    length: 10,
    default: 'medium'
  })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relationships
  @ManyToOne('Project', 'workItems', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: any;
}
