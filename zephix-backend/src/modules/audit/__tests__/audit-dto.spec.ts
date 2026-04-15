/**
 * Phase 3B: Audit DTO tests.
 */
import { toAuditEventDto } from '../dto/audit-event.dto';
import { AuditEvent } from '../entities/audit-event.entity';

describe('toAuditEventDto', () => {
  it('maps all fields correctly', () => {
    const event = new AuditEvent();
    event.id = 'evt-1';
    event.organizationId = 'org-1';
    event.workspaceId = 'ws-1';
    event.actorUserId = 'u-1';
    event.actorPlatformRole = 'ADMIN';
    event.actorWorkspaceRole = 'workspace_owner';
    event.entityType = 'work_task';
    event.entityId = 'task-1';
    event.action = 'update';
    event.beforeJson = { status: 'todo' };
    event.afterJson = { status: 'done' };
    event.metadataJson = { source: 'board' };
    event.createdAt = new Date('2026-01-15T10:00:00Z');

    const dto = toAuditEventDto(event);

    expect(dto.id).toBe('evt-1');
    expect(dto.organizationId).toBe('org-1');
    expect(dto.workspaceId).toBe('ws-1');
    expect(dto.actorUserId).toBe('u-1');
    expect(dto.actorPlatformRole).toBe('ADMIN');
    expect(dto.actorWorkspaceRole).toBe('workspace_owner');
    expect(dto.entityType).toBe('work_task');
    expect(dto.entityId).toBe('task-1');
    expect(dto.action).toBe('update');
    expect(dto.beforeJson).toEqual({ status: 'todo' });
    expect(dto.afterJson).toEqual({ status: 'done' });
    expect(dto.metadataJson).toEqual({ source: 'board' });
    expect(dto.createdAt).toBe('2026-01-15T10:00:00.000Z');
    expect(dto.description).toBe('update on work_task');
    expect(dto.actorName).toBeNull();
  });

  it('handles null optional fields', () => {
    const event = new AuditEvent();
    event.id = 'evt-2';
    event.organizationId = 'org-1';
    event.workspaceId = null;
    event.actorUserId = 'u-1';
    event.actorPlatformRole = 'MEMBER';
    event.actorWorkspaceRole = null;
    event.entityType = 'attachment';
    event.entityId = 'att-1';
    event.action = 'presign_create';
    event.beforeJson = null;
    event.afterJson = null;
    event.metadataJson = null;
    event.createdAt = new Date('2026-02-01T12:00:00Z');

    const dto = toAuditEventDto(event);

    expect(dto.workspaceId).toBeNull();
    expect(dto.actorWorkspaceRole).toBeNull();
    expect(dto.beforeJson).toBeNull();
    expect(dto.afterJson).toBeNull();
    expect(dto.metadataJson).toBeNull();
    expect(dto.description).toBe('presign create on attachment');
    expect(dto.actorName).toBeNull();
  });

  it('uses metadata.summary for description when present', () => {
    const event = new AuditEvent();
    event.id = 'evt-3';
    event.organizationId = 'org-1';
    event.workspaceId = null;
    event.actorUserId = 'u-1';
    event.actorPlatformRole = 'ADMIN';
    event.actorWorkspaceRole = null;
    event.entityType = 'project';
    event.entityId = 'p-1';
    event.action = 'update';
    event.beforeJson = null;
    event.afterJson = null;
    event.metadataJson = { summary: 'Renamed project Alpha' };
    event.createdAt = new Date('2026-03-01T08:00:00Z');

    const dto = toAuditEventDto(event);
    expect(dto.description).toBe('Renamed project Alpha');
  });
});
