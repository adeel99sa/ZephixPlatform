import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Dashboard } from './dashboard.entity';
import {
  DashboardExportFormat,
  DashboardExportStatus,
  DashboardScope,
} from '../domain/dashboard.enums';

@Entity('dashboard_export_jobs')
@Index('idx_dashboard_export_jobs_org', ['organizationId'])
@Index('idx_dashboard_export_jobs_dashboard', ['dashboardId'])
export class DashboardExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'dashboard_id' })
  dashboardId!: string;

  @Column({ type: 'enum', enum: DashboardScope })
  scope!: DashboardScope;

  @Column({ type: 'uuid', name: 'requested_by_user_id' })
  requestedByUserId!: string;

  @Column({ type: 'enum', enum: DashboardExportFormat })
  format!: DashboardExportFormat;

  @Column({
    type: 'enum',
    enum: DashboardExportStatus,
    default: DashboardExportStatus.QUEUED,
  })
  status!: DashboardExportStatus;

  @Column({ type: 'jsonb', nullable: true })
  filters!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true, name: 'file_key' })
  fileKey!: string | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'finished_at' })
  finishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Dashboard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard!: Dashboard;
}
