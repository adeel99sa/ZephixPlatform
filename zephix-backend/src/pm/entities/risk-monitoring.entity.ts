import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Risk } from './risk.entity';

@Entity('risk_monitoring')
@Index(['riskId', 'monitoringDate'])
@Index(['alertStatus', 'monitoringDate'])
export class RiskMonitoring {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  riskId: string;

  @Column('date')
  monitoringDate: Date;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
    default: 'weekly',
  })
  monitoringFrequency: string;

  // Key Performance Indicators
  @Column('jsonb')
  kpis: Array<{
    name: string;
    description: string;
    value: number;
    unit: string;
    target: number;
    threshold: {
      warning: number;
      critical: number;
    };
    trend: 'improving' | 'stable' | 'deteriorating';
    variance: number;
    notes?: string;
  }>;

  // Monitoring Data
  @Column('jsonb')
  monitoringData: {
    warningSignalsDetected: string[];
    leadIndicatorsStatus: Array<{
      indicator: string;
      status: 'normal' | 'warning' | 'critical';
      value: number;
      change: number;
    }>;
    thresholdBreaches: Array<{
      metric: string;
      threshold: string;
      actualValue: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    observations: string[];
    dataQuality: 'high' | 'medium' | 'low';
  };

  // Alert Management
  @Column({
    type: 'enum',
    enum: ['none', 'information', 'warning', 'critical', 'emergency'],
    default: 'none',
  })
  alertLevel: string;

  @Column({
    type: 'enum',
    enum: ['active', 'acknowledged', 'resolved', 'false-positive'],
    nullable: true,
  })
  alertStatus: string;

  @Column('text', { nullable: true })
  alertDescription: string;

  @Column('jsonb', { nullable: true })
  alertActions: Array<{
    action: string;
    takenBy: string;
    timestamp: string;
    result: string;
  }>;

  // Risk Assessment Updates
  @Column('decimal', { precision: 3, scale: 1, nullable: true })
  updatedProbability: number;

  @Column('decimal', { precision: 3, scale: 1, nullable: true })
  updatedImpact: number;

  @Column('text', { nullable: true })
  assessmentChanges: string;

  @Column('text', { nullable: true })
  recommendedActions: string;

  // Monitoring Assignment
  @Column('uuid')
  assignedTo: string;

  @Column('uuid', { nullable: true })
  reviewedBy: string;

  @Column('timestamp', { nullable: true })
  reviewedAt: Date;

  @Column('text', { nullable: true })
  reviewNotes: string;

  // Next Monitoring
  @Column('date')
  nextMonitoringDate: Date;

  @Column('boolean', { default: false })
  escalationRequired: boolean;

  @Column('text', { nullable: true })
  escalationReason: string;

  @Column('uuid')
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Risk, (risk) => risk.monitoring)
  @JoinColumn({ name: 'riskId' })
  risk: Risk;
}
