import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Dashboard } from './dashboard.entity';
import { DashboardShareAccess } from '../domain/dashboard.enums';

@Entity('dashboard_shares')
@Index('idx_dashboard_shares_org', ['organizationId'])
@Index('idx_dashboard_shares_dashboard', ['dashboardId'])
@Index('uq_dashboard_shares_active', [
  'dashboardId',
  'invitedUserId',
  'revokedAt',
])
export class DashboardShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'dashboard_id' })
  dashboardId!: string;

  @Column({ type: 'uuid', name: 'invited_user_id' })
  invitedUserId!: string;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @Column({ type: 'enum', enum: DashboardShareAccess })
  access!: DashboardShareAccess;

  @Column({ type: 'boolean', default: false, name: 'export_allowed' })
  exportAllowed!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Dashboard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard!: Dashboard;
}
