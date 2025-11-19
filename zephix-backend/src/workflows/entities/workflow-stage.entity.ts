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
  DeleteDateColumn,
} from 'typeorm';
import { WorkflowTemplate } from './workflow-template.entity';
import { WorkflowApproval } from './workflow-approval.entity';

export enum StageType {
  INITIATION = 'initiation',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
  CLOSURE = 'closure',
  SPRINT = 'sprint',
  REVIEW = 'review',
  RETROSPECTIVE = 'retrospective',
  CUSTOM = 'custom',
}

export enum StageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

@Entity('workflow_stages')
@Index('IDX_WORKFLOW_STAGE_TEMPLATE', ['workflowTemplateId'])
@Index('IDX_WORKFLOW_STAGE_ORDER', ['workflowTemplateId', 'order'])
@Index('IDX_WORKFLOW_STAGE_TYPE', ['type'])
@Index('IDX_WORKFLOW_STAGE_STATUS', ['status'])
export class WorkflowStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workflowTemplateId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: StageType,
    default: StageType.CUSTOM,
  })
  type: StageType;

  @Column({
    type: 'enum',
    enum: StageStatus,
    default: StageStatus.ACTIVE,
  })
  status: StageStatus;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'int', default: 1 })
  estimatedDuration: number; // in days

  @Column({ type: 'varchar', length: 50, default: 'days' })
  durationUnit: string;

  @Column({ type: 'jsonb', default: {} })
  entryCriteria: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  exitCriteria: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  deliverables: string[];

  @Column({ type: 'jsonb', default: {} })
  roles: Array<{
    role: string;
    responsibilities: string[];
    required: boolean;
  }>;

  @Column({ type: 'jsonb', default: {} })
  raciMatrix: {
    responsible: string[];
    accountable: string[];
    consulted: string[];
    informed: string[];
  };

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: false })
  isMilestone: boolean;

  @Column({ type: 'jsonb', default: {} })
  dependencies: string[]; // IDs of stages this stage depends on

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => WorkflowTemplate, (template) => template.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowTemplateId' })
  workflowTemplate: WorkflowTemplate;

  @OneToMany(() => WorkflowApproval, (approval) => approval.workflowStage, {
    cascade: true,
  })
  approvals: WorkflowApproval[];

  // Helper methods
  isActive(): boolean {
    return this.status === StageStatus.ACTIVE;
  }

  hasDependencies(): boolean {
    return this.dependencies && this.dependencies.length > 0;
  }

  getDurationInDays(): number {
    if (this.durationUnit === 'weeks') {
      return this.estimatedDuration * 7;
    } else if (this.durationUnit === 'months') {
      return this.estimatedDuration * 30;
    }
    return this.estimatedDuration;
  }

  canProceed(completedStages: string[]): boolean {
    if (!this.hasDependencies()) {
      return true;
    }
    return this.dependencies.every((dep) => completedStages.includes(dep));
  }
}
