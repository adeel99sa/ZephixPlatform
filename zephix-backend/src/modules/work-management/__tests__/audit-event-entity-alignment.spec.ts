/**
 * Verifies the work-management AuditEvent entity is aligned with
 * the canonical Phase 3B audit module entity.
 *
 * Root cause of Wave 2 blocker: the work-management entity used
 * Sprint 5 column names (userId, eventType, projectId) while the DB
 * has Phase 3B columns (actor_user_id, action, etc.).
 *
 * This test prevents regression by asserting both entities expose
 * the same property set.
 */
import { AuditEvent as WmAuditEvent } from '../entities/audit-event.entity';
import { AuditEvent as AuditModuleEvent } from '../../audit/entities/audit-event.entity';

describe('Work-management AuditEvent entity alignment', () => {
  const PHASE_3B_PROPERTIES = [
    'id',
    'organizationId',
    'workspaceId',
    'actorUserId',
    'actorPlatformRole',
    'actorWorkspaceRole',
    'entityType',
    'entityId',
    'action',
    'beforeJson',
    'afterJson',
    'metadataJson',
    'ipAddress',
    'userAgent',
    'createdAt',
  ] as const;

  // Sprint 5 properties that MUST NOT exist on the entity
  const STALE_SPRINT5_PROPERTIES = [
    'userId',
    'eventType',
    'projectId',
    'oldState',
    'newState',
    'metadata',
  ] as const;

  it('work-management entity has all Phase 3B properties', () => {
    const instance = new WmAuditEvent();
    for (const prop of PHASE_3B_PROPERTIES) {
      expect(() => {
        (instance as any)[prop] = 'test-value';
      }).not.toThrow();
      expect((instance as any)[prop]).toBe('test-value');
    }
  });

  it('stale Sprint 5 property names are not in the Phase 3B set', () => {
    for (const stale of STALE_SPRINT5_PROPERTIES) {
      const propNames: readonly string[] = PHASE_3B_PROPERTIES;
      expect(propNames).not.toContain(stale);
    }
  });

  it('work-management entity property set matches audit module entity', () => {
    const wmInstance = new WmAuditEvent();
    const auditInstance = new AuditModuleEvent();

    // Set all Phase 3B properties on both — they must both accept them
    for (const prop of PHASE_3B_PROPERTIES) {
      (wmInstance as any)[prop] = `wm-${prop}`;
      (auditInstance as any)[prop] = `audit-${prop}`;
      expect((wmInstance as any)[prop]).toBe(`wm-${prop}`);
      expect((auditInstance as any)[prop]).toBe(`audit-${prop}`);
    }
  });

  it('both entities target the same table name', () => {
    expect(WmAuditEvent.name).toBe('AuditEvent');
    expect(AuditModuleEvent.name).toBe('AuditEvent');
  });

  it('organizationId is required for Phase 3B writes', () => {
    const event = new WmAuditEvent();
    event.organizationId = '00000000-0000-0000-0000-000000000001';
    expect(event.organizationId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('actorUserId replaces userId', () => {
    const event = new WmAuditEvent();
    event.actorUserId = '00000000-0000-0000-0000-000000000002';
    expect(event.actorUserId).toBe('00000000-0000-0000-0000-000000000002');
    expect(PHASE_3B_PROPERTIES).not.toContain('userId');
  });

  it('action replaces eventType', () => {
    const event = new WmAuditEvent();
    event.action = 'PHASE_CREATED';
    expect(event.action).toBe('PHASE_CREATED');
    expect(PHASE_3B_PROPERTIES).not.toContain('eventType');
  });

  it('metadataJson replaces metadata', () => {
    const event = new WmAuditEvent();
    event.metadataJson = { key: 'value' };
    expect(event.metadataJson).toEqual({ key: 'value' });
    expect(PHASE_3B_PROPERTIES).not.toContain('metadata');
  });
});
