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
import { Dashboard } from './dashboard.entity';

@Entity('dashboard_widgets')
@Index(['dashboardId'])
@Index(['organizationId', 'dashboardId'])
@Index(['organizationId', 'widgetKey'])
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'dashboard_id' })
  dashboardId: string;

  @Column({ type: 'varchar', length: 120, name: 'widget_key' })
  widgetKey: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ type: 'jsonb' })
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Dashboard, (dashboard) => dashboard.widgets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;
}

