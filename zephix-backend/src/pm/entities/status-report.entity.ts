import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('status_reports')
@Index(['projectId', 'reportingPeriodStart'])
@Index(['overallStatus'])
@Index(['createdAt'])
export class StatusReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('date')
  reportingPeriodStart: Date;

  @Column('date')
  reportingPeriodEnd: Date;

  @Column({
    type: 'enum',
    enum: ['green', 'yellow', 'red'],
    default: 'green'
  })
  overallStatus: 'green' | 'yellow' | 'red';

  @Column('decimal', { precision: 5, scale: 2 })
  healthScore: number;

  @Column({
    type: 'enum',
    enum: ['executive', 'sponsor', 'team', 'client', 'all'],
    default: 'all'
  })
  stakeholderAudience: string;

  @Column({
    type: 'enum',
    enum: ['executive-summary', 'detailed', 'dashboard', 'presentation'],
    default: 'detailed'
  })
  reportFormat: string;

  // Comprehensive report data stored as JSON
  @Column('jsonb')
  reportData: {
    executiveSummary: {
      overallStatus: string;
      healthScore: number;
      keyAccomplishments: string[];
      criticalIssues: string[];
      nextPeriodFocus: string[];
      executiveActions: string[];
    };
    performanceAnalysis: {
      scheduleAnalysis: any;
      budgetAnalysis: any;
      scopeAnalysis: any;
    };
    riskAndIssues: any;
    achievements: any;
    upcomingActivities: any;
    predictiveInsights: any;
    stakeholderCommunication: any;
    actionItems: any[];
    appendices: any;
  };

  // Key metrics for quick querying
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  scheduleVariance: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  budgetVariance: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  scopeCompletion: number;

  @Column('integer', { nullable: true })
  activeRisks: number;

  @Column('integer', { nullable: true })
  criticalRisks: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  costPerformanceIndex: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  schedulePerformanceIndex: number;

  @Column('uuid')
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, project => project.statusReports)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
