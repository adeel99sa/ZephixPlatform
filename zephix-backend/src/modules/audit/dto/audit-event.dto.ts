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
  /** Resolved display label for admin audit table (not persisted on entity). */
  actorName: string | null;
  /** Human-readable summary for admin UI. */
  description: string;
}

/**
 * Build a non-empty description for audit rows (metadata.summary wins when present).
 */
export function buildAuditDescription(event: AuditEvent): string {
  const meta = event.metadataJson;
  if (meta && typeof meta === 'object') {
    const summary = (meta as Record<string, unknown>)['summary'];
    if (typeof summary === 'string' && summary.trim()) {
      return summary.trim();
    }
  }
  const action = String(event.action || 'event').replace(/_/g, ' ');
  const entity = String(event.entityType || 'record');
  return `${action} on ${entity}`;
}

export function toAuditEventDto(
  event: AuditEvent,
  extras?: { actorName?: string | null },
): AuditEventDto {
  const actorName =
    extras?.actorName != null && String(extras.actorName).trim()
      ? String(extras.actorName).trim()
      : null;
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
    actorName,
    description: buildAuditDescription(event),
  };
}
