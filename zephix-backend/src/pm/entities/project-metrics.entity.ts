import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('project_metrics')
@Index(['projectId', 'metricDate'])
@Index(['metricType'])
export class ProjectMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('date')
  metricDate: Date;

  @Column('varchar', { length: 100 })
  metricType: string; // 'schedule', 'budget', 'scope', 'quality', 'risk', 'team'

  @Column('varchar', { length: 100 })
  metricCategory: string; // subcategory within type

  @Column('decimal', { precision: 10, scale: 4 })
  metricValue: number;

  @Column('varchar', { length: 20, nullable: true })
  metricUnit: string; // 'percentage', 'currency', 'hours', 'count'

  @Column('jsonb', { nullable: true })
  metricMetadata: {
    source: string; // 'jira', 'github', 'manual', 'calculated'
    confidence: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    benchmark?: number;
    target?: number;
    additionalData?: any;
  };

  @Column('text', { nullable: true })
  notes: string;

  @Column('uuid')
  recordedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
