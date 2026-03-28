import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';
import { GateApprovalChain } from './gate-approval-chain.entity';

export enum ApprovalType {
  ANY_ONE = 'ANY_ONE',
  ALL = 'ALL',
}

@Entity('gate_approval_chain_steps')
@Index(['organizationId'])
@Index(['chainId'])
@Unique('UQ_step_order_per_chain', ['chainId', 'stepOrder'])
@Check(
  `"required_role" IS NOT NULL OR "required_user_id" IS NOT NULL`,
) // At least one target must be set
export class GateApprovalChainStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'chain_id' })
  chainId: string;

  @Column({ type: 'smallint', name: 'step_order' })
  stepOrder: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Role required to approve this step (e.g. 'ADMIN', 'PMO', 'FINANCE') */
  @Column({ type: 'varchar', length: 40, name: 'required_role', nullable: true })
  requiredRole: string | null;

  /** Specific user required (takes precedence over role) */
  @Column({ type: 'uuid', name: 'required_user_id', nullable: true })
  requiredUserId: string | null;

  @Column({
    type: 'enum',
    enum: ApprovalType,
    name: 'approval_type',
    default: ApprovalType.ANY_ONE,
  })
  approvalType: ApprovalType;

  /** For ALL type: how many approvals needed. Default 1. */
  @Column({ type: 'smallint', name: 'min_approvals', default: 1 })
  minApprovals: number;

  /** Hours before auto-approve (null = no auto-approve) */
  @Column({ type: 'smallint', name: 'auto_approve_after_hours', nullable: true })
  autoApproveAfterHours: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => GateApprovalChain, (chain) => chain.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chain_id' })
  chain: GateApprovalChain;
}
