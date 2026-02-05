import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export type ProjectViewType =
  | 'list'
  | 'board'
  | 'calendar'
  | 'gantt'
  | 'team'
  | 'doc'
  | 'dashboard';

@Entity({ name: 'project_views' })
@Index(['projectId', 'type'], { unique: true })
export class ProjectView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project!: Project;

  @Column({ type: 'varchar', length: 40 })
  type!: ProjectViewType;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ type: 'jsonb', default: {} })
  config!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
