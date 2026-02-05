import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Audit events for work management operations
 * Tracks acknowledgements and phase updates
 */
@Entity('audit_events')
@Index(['workspaceId', 'projectId'])
@Index(['userId', 'createdAt'])
@Index(['eventType'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType: string; // ACK_CONSUMED, PHASE_UPDATED_WITH_ACK, TEMPLATE_APPLIED, DOC_TRANSITION, GATE_DECIDE

  @Column({ type: 'varchar', length: 50, name: 'entity_type' })
  entityType: string; // PHASE, TASK, PROJECT, TEMPLATE_LINEAGE, DOCUMENT_INSTANCE, GATE_APPROVAL

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', name: 'old_state', nullable: true })
  oldState: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'new_state', nullable: true })
  newState: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
