import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { WorkflowTemplate } from './workflow-template.entity';
import { User } from '../../users/entities/user.entity';

export interface StageHistoryEntry {
  stageId: string;
  enteredAt: Date;
  exitedAt?: Date;
  actor: string;
  notes?: string;
  duration?: number; // in milliseconds
}

export interface ApprovalEntry {
  stageId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp: Date;
  remindersSent?: number;
}

export interface WorkflowInstanceData {
  formData: Record<string, any>;
  customFields: Record<string, any>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
  }>;
  metrics: {
    totalDuration?: number;
    stageMetrics?: Record<string, { duration: number; attempts: number }>;
  };
}

@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => WorkflowTemplate, (template) => template.instances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template: WorkflowTemplate;

  @Column('uuid')
  templateId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'cancelled', 'on_hold', 'failed'],
    default: 'active',
  })
  status: string;

  @Column({ nullable: true })
  currentStage: string;

  @Column({ type: 'jsonb', default: {} })
  data: WorkflowInstanceData;

  @Column({ type: 'jsonb', default: [] })
  stageHistory: StageHistoryEntry[];

  @Column({ type: 'jsonb', default: [] })
  approvals: ApprovalEntry[];

  @Column('uuid', { nullable: true })
  assignedTo: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignedUser: User;

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    sourceType?: 'intake' | 'manual' | 'api';
    sourceId?: string;
    externalReferences?: Array<{
      type: string;
      id: string;
      url?: string;
    }>;
    labels?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getCurrentStageEntry(): StageHistoryEntry | null {
    if (!this.currentStage) return null;

    return (
      this.stageHistory
        .filter(
          (entry) => entry.stageId === this.currentStage && !entry.exitedAt,
        )
        .sort(
          (a, b) =>
            new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime(),
        )[0] || null
    );
  }

  getStageHistory(stageId: string): StageHistoryEntry[] {
    return this.stageHistory.filter((entry) => entry.stageId === stageId);
  }

  getPendingApprovals(): ApprovalEntry[] {
    return this.approvals.filter((approval) => approval.status === 'pending');
  }

  getApprovalForStage(stageId: string): ApprovalEntry[] {
    return this.approvals.filter((approval) => approval.stageId === stageId);
  }

  isApprovalRequired(stageId: string): boolean {
    return this.approvals.some(
      (approval) =>
        approval.stageId === stageId && approval.status === 'pending',
    );
  }

  canProgressToNextStage(): boolean {
    if (!this.currentStage) return false;

    const pendingApprovals = this.approvals.filter(
      (approval) =>
        approval.stageId === this.currentStage && approval.status === 'pending',
    );

    return pendingApprovals.length === 0;
  }

  getTotalDuration(): number | null {
    if (this.status !== 'completed') return null;

    const firstEntry = this.stageHistory[0];
    const lastEntry = this.stageHistory
      .filter((entry) => entry.exitedAt)
      .sort(
        (a, b) =>
          new Date(b.exitedAt).getTime() - new Date(a.exitedAt).getTime(),
      )[0];

    if (!firstEntry || !lastEntry?.exitedAt) return null;

    return (
      new Date(lastEntry.exitedAt).getTime() -
      new Date(firstEntry.enteredAt).getTime()
    );
  }

  getStageMetrics(): Record<string, { duration: number; attempts: number }> {
    const metrics: Record<string, { duration: number; attempts: number }> = {};

    this.stageHistory.forEach((entry) => {
      if (!metrics[entry.stageId]) {
        metrics[entry.stageId] = { duration: 0, attempts: 0 };
      }

      metrics[entry.stageId].attempts++;

      if (entry.exitedAt) {
        const duration =
          new Date(entry.exitedAt).getTime() -
          new Date(entry.enteredAt).getTime();
        metrics[entry.stageId].duration += duration;
      }
    });

    return metrics;
  }
}
