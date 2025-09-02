import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BRDAnalysis } from './brd-analysis.entity';

export enum ProjectMethodology {
  WATERFALL = 'waterfall',
  AGILE = 'agile',
  HYBRID = 'hybrid',
}

@Entity('generated_project_plans')
@Index(['organizationId', 'brdAnalysisId'])
@Index(['methodology'])
@Index(['generatedBy'])
export class GeneratedProjectPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  brdAnalysisId: string;

  @Column('uuid')
  organizationId: string;

  @Column({
    type: 'enum',
    enum: ProjectMethodology,
  })
  methodology: ProjectMethodology;

  @Column('jsonb')
  planStructure: {
    phases?: Array<{
      id: string;
      name: string;
      description: string;
      duration: number;
      dependencies: string[];
      deliverables: string[];
      milestones: Array<{
        name: string;
        date: string;
        criteria: string[];
      }>;
    }>;
    epics?: Array<{
      id: string;
      title: string;
      description: string;
      priority: number;
      storyPoints: number;
      acceptanceCriteria: string[];
      userStories: Array<{
        id: string;
        title: string;
        description: string;
        storyPoints: number;
        acceptanceCriteria: string[];
      }>;
    }>;
    tasks: Array<{
      id: string;
      name: string;
      description: string;
      estimatedHours: number;
      dependencies: string[];
      assignedRole: string;
      phase?: string;
      epic?: string;
    }>;
  };

  @Column('jsonb')
  resourcePlan: {
    roles: Array<{
      role: string;
      skillsRequired: string[];
      timeCommitment: string;
      duration: string;
    }>;
    timeline: {
      startDate: string;
      endDate: string;
      criticalPath: string[];
      bufferTime: number;
    };
    budget: {
      totalEstimate: number;
      breakdown: Array<{
        category: string;
        amount: number;
        description: string;
      }>;
    };
  };

  @Column('jsonb')
  riskRegister: Array<{
    id: string;
    risk: string;
    category: string;
    impact: 'high' | 'medium' | 'low';
    probability: 'high' | 'medium' | 'low';
    riskScore: number;
    mitigation: string;
    contingency: string;
    owner: string;
  }>;

  @Column('jsonb')
  generationMetadata: {
    confidence: number;
    methodology: string;
    alternativesConsidered: string[];
    assumptions: string[];
    recommendations: string[];
  };

  @Column('jsonb', { nullable: true })
  changesMade: Array<{
    refinementRequest: string;
    changes: string[];
    timestamp: Date;
    confidence: number;
  }>;

  @Column('uuid')
  generatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => BRDAnalysis, (analysis) => analysis.generatedPlans)
  @JoinColumn({ name: 'brdAnalysisId' })
  brdAnalysis: BRDAnalysis;
}
