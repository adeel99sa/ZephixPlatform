import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';

export type PhaseStatus = 'not-started' | 'in-progress' | 'blocked' | 'done';

@Entity({ name: 'project_phases' })
@Index(['projectId', 'order'], { unique: true })
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => Project, (p) => p.id, { onDelete: 'CASCADE' })
  project!: Project;

  @Column('uuid', { name: 'organization_id' })
  organizationId!: string;

  @Column('uuid', { name: 'workspace_id', nullable: true })
  workspaceId!: string | null;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 32, default: 'not-started' })
  status!: PhaseStatus;

  // 🔒 Reserve-safe mapping
  @Column({ type: 'int', name: 'order' })
  order!: number;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate?: string | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate?: string | null;

  @Column({ type: 'uuid', name: 'owner_user_id', nullable: true })
  ownerUserId?: string | null;

  @OneToMany(() => Task, task => task.phase)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
