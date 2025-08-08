import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Risk } from './risk.entity';

@Entity('risk_responses')
@Index(['riskId', 'strategy'])
@Index(['createdAt', 'strategy'])
export class RiskResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  riskId: string;

  @Column({ 
    type: 'enum', 
    enum: ['avoid', 'transfer', 'mitigate', 'accept'],
  })
  strategy: string;

  @Column('text')
  rationale: string;

  @Column('text', { nullable: true })
  description: string;

  // Response Actions
  @Column('jsonb')
  actions: Array<{
    id: string;
    description: string;
    type: 'preventive' | 'corrective' | 'contingent';
    owner: string;
    dueDate: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
    estimatedCost?: number;
    estimatedEffort?: number;
    successCriteria: string[];
    completionDate?: string;
    notes?: string;
  }>;

  // Contingency Planning
  @Column('jsonb', { nullable: true })
  contingencyPlan: {
    description: string;
    triggerConditions: string[];
    activationCriteria: string[];
    actions: string[];
    requiredResources: Array<{
      type: 'human' | 'financial' | 'technical' | 'other';
      description: string;
      quantity: number;
      cost: number;
    }>;
    estimatedCost: number;
    timeline: string;
    decisionAuthority: string;
  };

  // Risk Transfer Details
  @Column('jsonb', { nullable: true })
  transferDetails: {
    method: 'insurance' | 'contract' | 'outsourcing' | 'partnership';
    provider: string;
    cost: number;
    coverage: string;
    terms: string;
    effectiveDate: string;
    expiryDate: string;
    clauses: string[];
  };

  // Response Monitoring
  @Column('jsonb')
  monitoring: {
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
    methods: string[];
    kpis: Array<{
      name: string;
      description: string;
      target: number;
      unit: string;
      current?: number;
      trend?: 'improving' | 'stable' | 'deteriorating';
      lastMeasured?: string;
    }>;
    reportingStructure: string[];
    escalationCriteria: string[];
  };

  // Effectiveness Measurement
  @Column('jsonb', { nullable: true })
  effectiveness: {
    probabilityReduction: number; // 0-100%
    impactReduction: number; // 0-100%
    costBenefit: number;
    implementationComplexity: 'low' | 'medium' | 'high';
    timeToImplement: number; // days
    successRate: number; // 0-100%
    lessonsLearned: string[];
  };

  @Column({ 
    type: 'enum', 
    enum: ['draft', 'approved', 'active', 'completed', 'cancelled'],
    default: 'draft'
  })
  status: string;

  @Column('date', { nullable: true })
  approvedDate: Date;

  @Column('uuid', { nullable: true })
  approvedBy: string;

  @Column('date', { nullable: true })
  implementationDate: Date;

  @Column('date', { nullable: true })
  completedDate: Date;

  // Complete response data for analysis
  @Column('jsonb', { nullable: true })
  responseData: {
    originalPlan?: any;
    modifications?: any[];
    performanceHistory?: any[];
    stakeholderFeedback?: any[];
  };

  @Column('uuid')
  createdBy: string;

  @Column('uuid', { nullable: true })
  lastUpdatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Risk, risk => risk.responses)
  @JoinColumn({ name: 'riskId' })
  risk: Risk;
}
