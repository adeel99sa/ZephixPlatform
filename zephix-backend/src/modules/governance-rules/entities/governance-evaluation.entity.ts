import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum TransitionType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  PHASE_CHANGE = 'PHASE_CHANGE',
  GATE_DECISION = 'GATE_DECISION',
  APPROVAL_DECISION = 'APPROVAL_DECISION',
}

export enum EvaluationDecision {
  ALLOW = 'ALLOW',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
  OVERRIDE = 'OVERRIDE',
  /**
   * SKIP-1: a rule that WOULD have applied to this transition did not run, and
   * this row is its receipt. A skip is a first-class outcome — never an absence.
   * `skipReason` carries the machine token (NON_EVALUABLE:<code(s)> or
   * NO_ACTIVE_VERSION). Callers treat SKIPPED like ALLOW (the transition
   * proceeds); only BLOCK/WARN change caller behavior.
   */
  SKIPPED = 'SKIPPED',
}

export interface EvaluationReason {
  code: string;
  message: string;
  failedCondition?: string;
  ruleId?: string;
  ruleVersion?: number;
}

@Entity({ name: 'governance_evaluations' })
export class GovernanceEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'entity_type', type: 'text' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'transition_type', type: 'text' })
  transitionType: TransitionType;

  @Column({ name: 'from_value', type: 'text', nullable: true })
  fromValue: string | null;

  @Column({ name: 'to_value', type: 'text', nullable: true })
  toValue: string | null;

  @Column({ name: 'rule_set_id', type: 'uuid', nullable: true })
  ruleSetId: string | null;

  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  ruleId: string | null;

  @Column({ name: 'rule_version', type: 'int', nullable: true })
  ruleVersion: number | null;

  @Column({ name: 'enforcement_mode', type: 'text' })
  enforcementMode: string;

  @Column({ type: 'text' })
  decision: EvaluationDecision;

  /**
   * SKIP-1: structured skip token, non-null only on decision='SKIPPED' rows.
   * NON_EVALUABLE:<code(s)> — a rule matched the transition but has no data
   * source; NO_ACTIVE_VERSION — a rule set was active with no version pointer.
   */
  @Column({ name: 'skip_reason', type: 'text', nullable: true })
  skipReason: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  reasons: EvaluationReason[];

  @Column({ name: 'inputs_hash', type: 'text', nullable: true })
  inputsHash: string | null;

  @Column({ name: 'inputs_snapshot', type: 'jsonb', nullable: true })
  inputsSnapshot: Record<string, any> | null;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId: string;

  @Column({ name: 'request_id', type: 'text', nullable: true })
  requestId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
