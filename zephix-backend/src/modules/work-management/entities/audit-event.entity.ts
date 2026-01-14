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

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType: string; // ACK_CONSUMED, PHASE_UPDATED_WITH_ACK

  @Column({ type: 'varchar', length: 50, name: 'entity_type' })
  entityType: string; // PHASE, TASK, PROJECT

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
