import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

export enum IterationStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('iterations')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['projectId', 'status'])
export class Iteration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  goal: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: IterationStatus.PLANNING,
  })
  status: IterationStatus;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'capacity_hours',
    nullable: true,
  })
  capacityHours: number | null;

  @Column({ type: 'integer', name: 'planned_points', nullable: true })
  plannedPoints: number | null;

  @Column({ type: 'integer', name: 'committed_points', nullable: true })
  committedPoints: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'committed_hours',
    nullable: true,
  })
  committedHours: number | null;

  @Column({ type: 'integer', name: 'completed_points', nullable: true })
  completedPoints: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'completed_hours',
    nullable: true,
  })
  completedHours: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
