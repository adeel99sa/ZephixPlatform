import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { RiskResponse } from './risk-response.entity';
import { RiskMonitoring } from './risk-monitoring.entity';

@Entity('risks')
@Index(['projectId', 'riskLevel'])
@Index(['projectId', 'status'])
@Index(['category', 'riskLevel'])
@Index(['createdAt', 'riskScore'])
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ['technical', 'resource', 'schedule', 'budget', 'scope', 'quality', 'external', 'stakeholder', 'regulatory', 'market'],
  })
  category: string;

  @Column('varchar', { length: 100, nullable: true })
  subcategory: string;

  // Risk Assessment Data
  @Column('decimal', { precision: 3, scale: 1 })
  probability: number; // 1-5 scale

  @Column('decimal', { precision: 3, scale: 1 })
  impact: number; // Overall impact 1-5 scale

  @Column('jsonb')
  impactBreakdown: {
    schedule: number;
    budget: number;
    scope: number;
    quality: number;
  };

  @Column('decimal', { precision: 4, scale: 1 })
  riskScore: number; // Calculated: probability * impact

  @Column({ 
    type: 'enum', 
    enum: ['very-low', 'low', 'medium', 'high', 'very-high'],
  })
  riskLevel: string;

  // Risk Status and Lifecycle
  @Column({ 
    type: 'enum', 
    enum: ['identified', 'active', 'monitoring', 'resolved', 'closed', 'escalated'],
    default: 'identified'
  })
  status: string;

  @Column('text', { nullable: true })
  statusNotes: string;

  @Column('uuid', { nullable: true })
  assignedTo: string;

  @Column('date', { nullable: true })
  expectedOccurrence: Date;

  @Column('date', { nullable: true })
  closedDate: Date;

  // Quantified Impact Estimates
  @Column('integer', { nullable: true })
  scheduleImpactDays: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  budgetImpactAmount: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  scopeImpactPercent: number;

  @Column('text', { nullable: true })
  qualityImpactDescription: string;

  // Triggers and Monitoring
  @Column('jsonb')
  triggers: {
    warningSignals: string[];
    leadIndicators: string[];
    thresholds: Array<{
      metric: string;
      value: number;
      operator: 'greater-than' | 'less-than' | 'equals';
    }>;
  };

  // Dependencies and Relationships
  @Column('jsonb', { nullable: true })
  dependencies: {
    relatedRisks: string[];
    affectedWorkPackages: string[];
    impactedStakeholders: string[];
  };

  // Risk Source and Confidence
  @Column({ 
    type: 'enum', 
    enum: ['ai-identified', 'manual-entry', 'stakeholder-feedback', 'historical-analysis', 'external-scan'],
    default: 'manual-entry'
  })
  source: string;

  @Column('decimal', { precision: 5, scale: 2, default: 100 })
  confidence: number; // 0-100%

  @Column('text', { nullable: true })
  probabilityRationale: string;

  @Column('jsonb', { nullable: true })
  evidencePoints: string[];

  // Complete risk data for AI analysis
  @Column('jsonb')
  riskData: {
    originalAssessment?: any;
    aiAnalysis?: any;
    historicalContext?: any;
    externalFactors?: any;
  };

  // Audit Fields
  @Column('uuid')
  createdBy: string;

  @Column('uuid', { nullable: true })
  lastUpdatedBy: string;

  @Column('timestamp', { nullable: true })
  lastAssessmentDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  // REMOVED Project relationship to prevent circular dependency
  // @ManyToOne(() => Project, project => project.risks)
  // @JoinColumn({ name: 'projectId' })
  // project: Project;

  @OneToMany(() => RiskResponse, response => response.risk)
  responses: RiskResponse[];

  @OneToMany(() => RiskMonitoring, monitoring => monitoring.risk)
  monitoring: RiskMonitoring[];
}
