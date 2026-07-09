import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * Evidence artifact attached to a phase gate submission.
 * Enforces GATE_EVIDENCE_REQUIRED policy: submission cannot advance
 * to SUBMITTED without at least one row here.
 */
@Entity('gate_submission_evidence')
@Unique('uq_gse_sub_item', ['submissionId', 'artifactItemId'])
@Index('idx_gse_submission', ['submissionId'])
@Index('idx_gse_org', ['organizationId'])
export class GateSubmissionEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'uuid', name: 'artifact_item_id' })
  artifactItemId: string;

  @Column({ type: 'uuid', name: 'attached_by_user_id' })
  attachedByUserId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
