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

@Entity('phase_gate_submission_documents')
@Index(['submissionId'])
@Unique(['submissionId', 'documentId'])
export class PhaseGateSubmissionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
