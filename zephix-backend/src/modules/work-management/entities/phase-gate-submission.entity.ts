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

export enum GateSubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Valid status transitions for gate submissions.
 */
export const GATE_TRANSITIONS: Record<GateSubmissionStatus, GateSubmissionStatus[]> = {
  [GateSubmissionStatus.DRAFT]: [GateSubmissionStatus.SUBMITTED, GateSubmissionStatus.CANCELLED],
  [GateSubmissionStatus.SUBMITTED]: [GateSubmissionStatus.APPROVED, GateSubmissionStatus.REJECTED, GateSubmissionStatus.CANCELLED],
  [GateSubmissionStatus.APPROVED]: [], // terminal
  [GateSubmissionStatus.REJECTED]: [GateSubmissionStatus.DRAFT], // can resubmit
  [GateSubmissionStatus.CANCELLED]: [GateSubmissionStatus.DRAFT], // can resubmit
};

@Entity('phase_gate_submissions')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['phaseId'])
@Index(['gateDefinitionId'])
@Index(['status'])
export class PhaseGateSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'phase_id' })
  phaseId: string;

  @Column({ type: 'uuid', name: 'gate_definition_id' })
  gateDefinitionId: string;

  @Column({
    type: 'enum',
    enum: GateSubmissionStatus,
    default: GateSubmissionStatus.DRAFT,
  })
  status: GateSubmissionStatus;

  @Column({ type: 'uuid', name: 'submitted_by_user_id', nullable: true })
  submittedByUserId: string | null;

  @Column({ type: 'timestamp', name: 'submitted_at', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'uuid', name: 'decision_by_user_id', nullable: true })
  decisionByUserId: string | null;

  @Column({ type: 'timestamp', name: 'decided_at', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', name: 'decision_note', nullable: true })
  decisionNote: string | null;

  /** Snapshot of documents at submission time */
  @Column({ type: 'jsonb', name: 'documents_snapshot', nullable: true })
  documentsSnapshot: Array<{ id: string; title: string; fileName?: string; tags?: string[] }> | null;

  /** Snapshot of checklist answers at submission time */
  @Column({ type: 'jsonb', name: 'checklist_snapshot', nullable: true })
  checklistSnapshot: { required: string[]; answered: string[] } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
