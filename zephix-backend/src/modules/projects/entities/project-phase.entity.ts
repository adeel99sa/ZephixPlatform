import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export type PhaseStatus = 'not-started' | 'in-progress' | 'blocked' | 'done';

@Entity({ name: 'project_phases' })
@Index(['projectId', 'order'], { unique: true })
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string;

  @ManyToOne(() => Project, (p) => p.id, { onDelete: 'CASCADE' })
  project!: Project;

  @Column('uuid')
  organizationId!: string;

  @Column('uuid', { nullable: true })
  workspaceId!: string | null;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 32, default: 'not-started' })
  status!: PhaseStatus;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
