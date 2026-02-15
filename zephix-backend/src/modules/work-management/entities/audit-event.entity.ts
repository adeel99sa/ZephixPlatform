import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

/**
 * Work-management audit event entity.
 *
 * MUST match the Phase 3B schema in modules/audit/entities/audit-event.entity.ts.
 * Both entities point to the same `audit_events` table. Column names and
 * types must be identical.
 *
 * Canonical source of truth: modules/audit/entities/audit-event.entity.ts
 */
@Entity('audit_events')
@Index('IDX_audit_events_org_created', ['organizationId', 'createdAt'])
@Index('IDX_audit_events_org_entity', ['organizationId', 'entityType', 'entityId', 'createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'uuid', name: 'actor_user_id' })
  actorUserId: string;

  @Column({ name: 'actor_platform_role' })
  actorPlatformRole: string;

  @Column({ name: 'actor_workspace_role', nullable: true })
  actorWorkspaceRole: string | null;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', name: 'before_json', nullable: true })
  beforeJson: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'after_json', nullable: true })
  afterJson: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'metadata_json', nullable: true })
  metadataJson: Record<string, any> | null;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
