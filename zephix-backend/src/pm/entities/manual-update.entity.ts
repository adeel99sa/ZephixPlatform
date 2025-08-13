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
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('manual_updates')
@Index(['projectId', 'createdAt'])
@Index(['category'])
@Index(['impact'])
export class ManualUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: ['schedule', 'budget', 'scope', 'quality', 'risk', 'stakeholder'],
  })
  category: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ['positive', 'negative', 'neutral'],
  })
  impact: string;

  @Column('jsonb', { nullable: true })
  quantitativeData: {
    scheduleImpact?: {
      daysDelay?: number;
      milestonesAffected?: string[];
    };
    budgetImpact?: {
      costChange?: number;
      budgetCategory?: string;
    };
    scopeImpact?: {
      requirementsAdded?: number;
      requirementsRemoved?: number;
      deliverableChanges?: string[];
    };
    qualityImpact?: {
      defectsFound?: number;
      testCoverageChange?: number;
    };
    riskImpact?: {
      newRisks?: any[];
      mitigatedRisks?: string[];
    };
    stakeholderImpact?: {
      satisfactionChange?: number;
      engagementLevel?: string;
    };
  };

  @Column('text', { array: true, nullable: true })
  attachments: string[];

  @Column('jsonb', { nullable: true })
  reviewStatus: {
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewComments?: string;
  };

  @Column('boolean', { default: false })
  includedInReport: boolean;

  @Column('uuid')
  submittedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
