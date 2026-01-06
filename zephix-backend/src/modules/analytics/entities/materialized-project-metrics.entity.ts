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
import { Project } from '../../../modules/projects/entities/project.entity';

/**
 * Phase 8: Materialized Project Metrics Entity
 * Stores pre-calculated project health and metrics
 */
@Entity('materialized_project_metrics')
@Index(['projectId'])
@Index(['health'])
export class MaterializedProjectMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 20, default: 'green' })
  health: 'green' | 'yellow' | 'red';

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'schedule_variance',
  })
  scheduleVariance: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'cost_variance',
  })
  costVariance: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'risk_exposure',
  })
  riskExposure: number;

  @Column({ type: 'integer', default: 0, name: 'overdue_count' })
  overdueCount: number;

  @Column({ type: 'integer', default: 0, name: 'tasks_due_this_week' })
  tasksDueThisWeek: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

