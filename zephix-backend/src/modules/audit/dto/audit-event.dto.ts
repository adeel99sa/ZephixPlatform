import { AuditEvent } from '../entities/audit-event.entity';

export interface AuditEventDto {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  actorUserId: string;
  actorPlatformRole: string;
  actorWorkspaceRole: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: Record<string, any> | null;
  afterJson: Record<string, any> | null;
  metadataJson: Record<string, any> | null;
  createdAt: string;
}

export function toAuditEventDto(event: AuditEvent): AuditEventDto {
  return {
    id: event.id,
    organizationId: event.organizationId,
    workspaceId: event.workspaceId,
    actorUserId: event.actorUserId,
    actorPlatformRole: event.actorPlatformRole,
    actorWorkspaceRole: event.actorWorkspaceRole,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    beforeJson: event.beforeJson,
    afterJson: event.afterJson,
    metadataJson: event.metadataJson,
    createdAt: event.createdAt?.toISOString?.() ?? String(event.createdAt),
  };
}
