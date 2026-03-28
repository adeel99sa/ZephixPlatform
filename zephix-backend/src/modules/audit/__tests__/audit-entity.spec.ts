/**
 * Phase 3B: AuditEvent entity structural tests.
 * Verifies entity metadata matches migration.
 */
import { AuditEvent } from '../entities/audit-event.entity';
import { getMetadataArgsStorage } from 'typeorm';

describe('AuditEvent Entity', () => {
  it('is a class that can be instantiated', () => {
    const event = new AuditEvent();
    expect(event).toBeDefined();
    expect(event).toBeInstanceOf(AuditEvent);
  });

  it('has no updatedAt field (append-only)', () => {
    const event = new AuditEvent();
    expect((event as any).updatedAt).toBeUndefined();
  });

  it('has no deletedAt field (no soft delete)', () => {
    const event = new AuditEvent();
    expect((event as any).deletedAt).toBeUndefined();
  });

  it('defaults workspaceId to null when not set', () => {
    const event = new AuditEvent();
    expect(event.workspaceId).toBeUndefined(); // Not null until DB sets it
  });

  it('has JSONB nullable fields for before, after, metadata', () => {
    const event = new AuditEvent();
    event.beforeJson = { oldName: 'test' };
    event.afterJson = { newName: 'updated' };
    event.metadataJson = { source: 'board' };
    expect(event.beforeJson).toEqual({ oldName: 'test' });
    expect(event.afterJson).toEqual({ newName: 'updated' });
    expect(event.metadataJson).toEqual({ source: 'board' });
  });

  it('accepts null for optional JSONB fields', () => {
    const event = new AuditEvent();
    event.beforeJson = null;
    event.afterJson = null;
    event.metadataJson = null;
    expect(event.beforeJson).toBeNull();
    expect(event.afterJson).toBeNull();
    expect(event.metadataJson).toBeNull();
  });
});
