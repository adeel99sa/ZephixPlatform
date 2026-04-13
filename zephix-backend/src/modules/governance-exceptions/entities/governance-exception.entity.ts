import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Phase 2C: Governance Exception Request
 *
 * Records exception requests against governed actions (capacity, budget, etc.).
 * Follows ADR-007 governed mutation pattern for auditability.
 */
@Entity('governance_exceptions')
@Index('IDX_govex_org_status', ['organizationId', 'status'])
@Index('IDX_govex_org_workspace', ['organizationId', 'workspaceId'])
export class GovernanceException {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 50, name: 'exception_type' })
  exceptionType: string; // CAPACITY, BUDGET, PHASE_GATE, OWNER_ASSIGNMENT

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO' | 'CONSUMED';

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid', name: 'requested_by_user_id' })
  requestedByUserId: string;

  @Column({ type: 'uuid', name: 'resolved_by_user_id', nullable: true })
  resolvedByUserId: string | null;

  @Column({ type: 'text', name: 'resolution_note', nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'uuid', name: 'audit_event_id', nullable: true })
  auditEventId: string | null; // Links to the governance_evaluate audit event

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
