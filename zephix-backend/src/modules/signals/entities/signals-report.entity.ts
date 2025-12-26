import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Phase 8: Signals Report Entity
 * Stores weekly signals reports with predictions and recommendations
 */
@Entity('signals_reports')
@Index(['organizationId'])
@Index(['weekRange'])
@Index(['createdAt'])
export class SignalsReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100, name: 'report_id' })
  reportId: string;

  @Column({ type: 'daterange', name: 'week_range' })
  weekRange: string; // PostgreSQL daterange type

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'jsonb', default: '[]', name: 'top_risks_json' })
  topRisksJson: any[];

  @Column({ type: 'jsonb', default: '[]', name: 'predictions_json' })
  predictionsJson: any[];

  @Column({ type: 'jsonb', default: '[]', name: 'actions_json' })
  actionsJson: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
