import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { GateApprovalChainStep } from './gate-approval-chain-step.entity';

export enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ABSTAINED = 'ABSTAINED',
}

@Entity('gate_approval_decisions')
@Index(['organizationId'])
@Index(['submissionId'])
@Index(['chainStepId'])
@Unique('UQ_one_decision_per_user_per_step', ['submissionId', 'chainStepId', 'decidedByUserId'])
export class GateApprovalDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'uuid', name: 'chain_step_id' })
  chainStepId: string;

  @Column({ type: 'uuid', name: 'decided_by_user_id' })
  decidedByUserId: string;

  @Column({
    type: 'enum',
    enum: ApprovalDecision,
  })
  decision: ApprovalDecision;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'decided_at' })
  decidedAt: Date;

  // Relations
  @ManyToOne(() => GateApprovalChainStep, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chain_step_id' })
  chainStep: GateApprovalChainStep;
}
