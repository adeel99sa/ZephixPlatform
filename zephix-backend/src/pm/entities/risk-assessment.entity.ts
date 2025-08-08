import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('risk_assessments')
@Index(['projectId', 'assessmentDate'])
@Index(['assessmentType', 'assessmentDate'])
export class RiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('date')
  assessmentDate: Date;

  @Column({ 
    type: 'enum', 
    enum: ['initial', 'periodic', 'triggered', 'milestone', 'ad-hoc'],
  })
  assessmentType: string;

  @Column('text', { nullable: true })
  assessmentTrigger: string;

  // Assessment Scope
  @Column('jsonb')
  assessmentScope: {
    includedCategories: string[];
    focusAreas: string[];
    stakeholdersInvolved: string[];
    dataSourcesUsed: string[];
    methodologyApplied: string;
  };

  // Assessment Results
  @Column('jsonb')
  assessmentResults: {
    totalRisksIdentified: number;
    newRisks: number;
    updatedRisks: number;
    closedRisks: number;
    riskDistribution: {
      veryHigh: number;
      high: number;
      medium: number;
      low: number;
      veryLow: number;
    };
    categoryBreakdown: Record<string, number>;
    topRisks: string[]; // Risk IDs
  };

  // Risk Analysis Summary
  @Column('jsonb')
  analysisSummary: {
    overallRiskProfile: 'low' | 'medium' | 'high' | 'very-high';
    riskTrends: 'improving' | 'stable' | 'deteriorating';
    criticalFindings: string[];
    keyChanges: string[];
    emergingRisks: string[];
    mitigationEffectiveness: number; // 0-100%
  };

  // Recommendations
  @Column('jsonb')
  recommendations: {
    immediateActions: Array<{
      action: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      owner: string;
      dueDate: string;
      rationale: string;
    }>;
    strategicRecommendations: string[];
    processImprovements: string[];
    resourceRequirements: string[];
    monitoringEnhancements: string[];
  };

  // AI Analysis Data
  @Column('jsonb', { nullable: true })
  aiAnalysis: {
    analysisVersion: string;
    processingTime: number;
    confidenceScore: number;
    dataQualityScore: number;
    assumptions: string[];
    limitations: string[];
    predictionAccuracy?: number;
  };

  // Stakeholder Involvement
  @Column('jsonb')
  stakeholderInput: {
    participatingStakeholders: Array<{
      name: string;
      role: string;
      contributionType: 'interview' | 'survey' | 'workshop' | 'review';
      feedback: string;
    }>;
    consensusLevel: 'high' | 'medium' | 'low';
    conflictingViews: string[];
  };

  // Assessment Quality
  @Column('jsonb')
  assessmentQuality: {
    dataCompleteness: number; // 0-100%
    stakeholderParticipation: number; // 0-100%
    methodologyAdherence: number; // 0-100%
    validationLevel: 'none' | 'peer-review' | 'expert-review' | 'formal-audit';
    limitations: string[];
  };

  // Follow-up Planning
  @Column('date', { nullable: true })
  nextAssessmentDate: Date;

  @Column('jsonb', { nullable: true })
  followUpActions: Array<{
    action: string;
    owner: string;
    dueDate: string;
    status: 'pending' | 'in-progress' | 'completed';
  }>;

  @Column('uuid')
  conductedBy: string;

  @Column('uuid', { nullable: true })
  reviewedBy: string;

  @Column('timestamp', { nullable: true })
  reviewedAt: Date;

  @Column({ 
    type: 'enum', 
    enum: ['draft', 'in-review', 'approved', 'published'],
    default: 'draft'
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, project => project.riskAssessments)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
