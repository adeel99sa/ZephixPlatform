import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RiskType {
  RESOURCE_OVERALLOCATION = 'resource_overallocation',
  SCHEDULE_VARIANCE = 'schedule_variance',
  BUDGET_VARIANCE = 'budget_variance',
  DEPENDENCY_BLOCK = 'dependency_block',
  SCOPE_CREEP = 'scope_creep',
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('risks')
@Index(['projectId', 'status'])
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  organizationId: string;

  @Column({
    type: 'enum',
    enum: RiskType,
  })
  type: RiskType;

  @Column({
    type: 'enum',
    enum: RiskSeverity,
    default: RiskSeverity.MEDIUM,
  })
  severity: RiskSeverity;

  @Column({ default: 'identified' })
  status: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @CreateDateColumn()
  detectedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
