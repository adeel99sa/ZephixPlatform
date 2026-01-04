import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DashboardWidget } from './dashboard-widget.entity';

export enum DashboardVisibility {
  PRIVATE = 'PRIVATE',
  WORKSPACE = 'WORKSPACE',
  ORG = 'ORG',
}

@Entity('dashboards')
@Index(['organizationId'])
@Index(['organizationId', 'workspaceId'])
@Index(['organizationId', 'visibility'])
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'owner_user_id' })
  ownerUserId: string;

  @Column({
    type: 'enum',
    enum: DashboardVisibility,
    default: DashboardVisibility.PRIVATE,
  })
  visibility: DashboardVisibility;

  @Column({ type: 'boolean', name: 'is_template_instance', default: false })
  isTemplateInstance: boolean;

  @Column({ type: 'varchar', length: 100, name: 'template_key', nullable: true })
  templateKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => DashboardWidget, (widget) => widget.dashboard, {
    cascade: true,
  })
  widgets: DashboardWidget[];
}

