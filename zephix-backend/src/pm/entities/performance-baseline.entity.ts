import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('performance_baselines')
@Index(['projectId', 'baselineType'])
export class PerformanceBaseline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('varchar', { length: 50 })
  baselineType: string; // 'scope', 'schedule', 'cost'

  @Column('date')
  baselineDate: Date;

  @Column('integer')
  version: number;

  @Column('jsonb')
  baselineData: {
    scope?: {
      totalRequirements: number;
      functionalRequirements: number;
      nonFunctionalRequirements: number;
      deliverables: any[];
    };
    schedule?: {
      plannedStartDate: string;
      plannedEndDate: string;
      totalDuration: number;
      milestones: any[];
      criticalPath: any[];
    };
    cost?: {
      totalBudget: number;
      budgetBreakdown: any[];
      contingency: number;
      approvedVariance: number;
    };
  };

  @Column('text', { nullable: true })
  changeReason: string;

  @Column('uuid')
  approvedBy: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
