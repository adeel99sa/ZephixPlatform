import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BRD } from './brd.entity';
import { GeneratedProjectPlan } from './generated-project-plan.entity';

@Entity('brd_analyses')
@Index(['organizationId', 'brdId'])
@Index(['analyzedBy'])
export class BRDAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  brdId: string;

  @Column('uuid')
  organizationId: string;

  @Column('jsonb')
  extractedElements: {
    objectives: string[];
    scope: {
      inclusions: string[];
      exclusions: string[];
      assumptions: string[];
    };
    deliverables: Array<{
      name: string;
      description: string;
      acceptanceCriteria: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
    stakeholders: Array<{
      name: string;
      role: string;
      responsibilities: string[];
      influence: 'high' | 'medium' | 'low';
    }>;
    constraints: {
      timeline: string;
      budget: string;
      resources: string[];
      technology: string[];
      regulatory: string[];
    };
    risks: Array<{
      risk: string;
      impact: 'high' | 'medium' | 'low';
      probability: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
    successCriteria: Array<{
      criteria: string;
      metric: string;
      target: string;
    }>;
  };

  @Column('jsonb')
  analysisMetadata: {
    confidence: number;
    processingTime: number;
    documentQuality: 'high' | 'medium' | 'low';
    missingElements: string[];
    suggestions: string[];
  };

  @Column('uuid')
  analyzedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => BRD, brd => brd.analyses)
  @JoinColumn({ name: 'brdId' })
  brd: BRD;

  @OneToMany(() => GeneratedProjectPlan, plan => plan.brdAnalysis)
  generatedPlans: GeneratedProjectPlan[];
}


