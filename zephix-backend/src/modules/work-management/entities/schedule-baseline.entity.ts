import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { ScheduleBaselineItem } from './schedule-baseline-item.entity';

@Entity('schedule_baselines')
@Index(['projectId', 'createdAt'])
export class ScheduleBaseline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'boolean', default: true })
  locked: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;

  @OneToMany(() => ScheduleBaselineItem, (item) => item.baseline, {
    cascade: true,
  })
  items: ScheduleBaselineItem[];
}
