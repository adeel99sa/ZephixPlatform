import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { WorkflowStage } from './workflow-stage.entity';
import { User } from '../../users/entities/user.entity';

export enum ApprovalType {
  STAGE_ENTRY = 'stage_entry',
  STAGE_EXIT = 'stage_exit',
  MILESTONE = 'milestone',
  DELIVERABLE = 'deliverable',
  BUDGET = 'budget',
  TIMELINE = 'timeline',
  QUALITY = 'quality',
  CUSTOM = 'custom',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled',
}

export enum ApprovalLevel {
  TEAM_LEAD = 'team_lead',
  PROJECT_MANAGER = 'project_manager',
  DEPARTMENT_HEAD = 'department_head',
  EXECUTIVE = 'executive',
  STAKEHOLDER = 'stakeholder',
  CUSTOM = 'custom',
}

@Entity('workflow_approvals')
@Index('IDX_WORKFLOW_APPROVAL_STAGE', ['workflowStageId'])
@Index('IDX_WORKFLOW_APPROVAL_REVIEWER', ['reviewerId'])
@Index('IDX_WORKFLOW_APPROVAL_STATUS', ['status'])
@Index('IDX_WORKFLOW_APPROVAL_TYPE', ['type'])
export class WorkflowApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workflowStageId: string;

  @Column('uuid')
  reviewerId: string;

  @Column({
    type: 'enum',
    enum: ApprovalType,
    default: ApprovalType.CUSTOM,
  })
  type: ApprovalType;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({
    type: 'enum',
    enum: ApprovalLevel,
    default: ApprovalLevel.TEAM_LEAD,
  })
  level: ApprovalLevel;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  criteria: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  requiredDocuments: string[];

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', default: {} })
  escalationRules: {
    autoEscalate: boolean;
    escalationDelay: number; // in hours
    escalationLevel: ApprovalLevel;
    escalationRecipients: string[];
  };

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'boolean', default: false })
  canBeSkipped: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => WorkflowStage, (stage) => stage.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowStageId' })
  workflowStage: WorkflowStage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  // Helper methods
  isPending(): boolean {
    return this.status === ApprovalStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === ApprovalStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === ApprovalStatus.REJECTED;
  }

  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.isPending();
  }

  shouldEscalate(): boolean {
    if (!this.escalationRules.autoEscalate) return false;
    if (!this.dueDate) return false;

    const escalationTime = new Date(
      this.dueDate.getTime() +
        this.escalationRules.escalationDelay * 60 * 60 * 1000,
    );
    return new Date() > escalationTime && this.isPending();
  }

  canApprove(userId: string): boolean {
    return this.reviewerId === userId && this.isPending();
  }

  canReject(userId: string): boolean {
    return this.reviewerId === userId && this.isPending();
  }
}
