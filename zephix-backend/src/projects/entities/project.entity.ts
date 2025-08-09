import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Team } from './team.entity';
import { StatusReport } from '../../pm/entities/status-report.entity';
import { ProjectMetrics } from '../../pm/entities/project-metrics.entity';
import { PerformanceBaseline } from '../../pm/entities/performance-baseline.entity';
import { AlertConfiguration } from '../../pm/entities/alert-configuration.entity';
import { ManualUpdate } from '../../pm/entities/manual-update.entity';
import { StakeholderCommunication } from '../../pm/entities/stakeholder-communication.entity';
import { Risk } from '../../pm/entities/risk.entity';
import { RiskAssessment } from '../../pm/entities/risk-assessment.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('projects')
@Index('IDX_PROJECT_NAME', ['name'])
@Index('IDX_PROJECT_STATUS', ['status'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'text', nullable: true })
  businessRequirementsDocument: string; // For future AI BRD processing

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToOne(() => Team, (team) => team.project, { cascade: true })
  team: Team;

  // Status reporting relations
  @OneToMany(() => StatusReport, statusReport => statusReport.project)
  statusReports: StatusReport[];

  @OneToMany(() => ProjectMetrics, metric => metric.project)
  metrics: ProjectMetrics[];

  @OneToMany(() => PerformanceBaseline, baseline => baseline.project)
  baselines: PerformanceBaseline[];

  @OneToMany(() => AlertConfiguration, alert => alert.project)
  alertConfigurations: AlertConfiguration[];

  @OneToMany(() => ManualUpdate, update => update.project)
  manualUpdates: ManualUpdate[];

  @OneToMany(() => StakeholderCommunication, communication => communication.project)
  stakeholderCommunications: StakeholderCommunication[];

  // Risk management relations
  @OneToMany(() => Risk, risk => risk.project)
  risks: Risk[];

  @OneToMany(() => RiskAssessment, assessment => assessment.project)
  riskAssessments: RiskAssessment[];

  // Add computed properties for quick access
  @Column('jsonb', { nullable: true })
  currentMetrics: {
    healthScore?: number;
    schedulePerformance?: number;
    budgetPerformance?: number;
    scopeCompletion?: number;
    riskLevel?: string;
    teamSatisfaction?: number;
    lastUpdated?: string;
  };

  @Column('date', { nullable: true })
  lastStatusReportDate: Date;

  @Column('varchar', { length: 20, nullable: true })
  currentPhase: string; // 'initiation', 'planning', 'execution', 'monitoring', 'closure'

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  overallCompletion: number;

  @Column('date', { nullable: true })
  forecastedCompletionDate: Date;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  forecastedFinalCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
