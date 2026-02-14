/**
 * Phase 3C: Entity Field Verification Tests
 *
 * Verifies Attachment and WorkspaceStorageUsage entities have
 * correct column definitions for Phase 3C additions.
 * Uses TypeORM metadata reflection to validate columns.
 */
import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';

describe('Entity Field Verification (Phase 3C)', () => {
  // Load entities after reflect-metadata
  const { Attachment } = require('../entities/attachment.entity');
  const { WorkspaceStorageUsage } = require('../../billing/entities/workspace-storage-usage.entity');

  const storage = getMetadataArgsStorage();

  const getColumnNames = (target: any): string[] => {
    return storage.columns
      .filter(c => c.target === target)
      .map(c => c.propertyName);
  };

  describe('Attachment entity', () => {
    let columns: string[];

    beforeAll(() => {
      columns = getColumnNames(Attachment);
    });

    it('has retentionDays column', () => {
      expect(columns).toContain('retentionDays');
    });

    it('has expiresAt column', () => {
      expect(columns).toContain('expiresAt');
    });

    it('has lastDownloadedAt column', () => {
      expect(columns).toContain('lastDownloadedAt');
    });

    it('has deletedAt column for lifecycle', () => {
      expect(columns).toContain('deletedAt');
    });

    it('has sizeBytes column for metering', () => {
      expect(columns).toContain('sizeBytes');
    });

    it('has status column for state tracking', () => {
      expect(columns).toContain('status');
    });

    it('has checksumSha256 column', () => {
      expect(columns).toContain('checksumSha256');
    });

    it('has uploadedAt column', () => {
      expect(columns).toContain('uploadedAt');
    });
  });

  describe('WorkspaceStorageUsage entity', () => {
    let columns: string[];

    beforeAll(() => {
      columns = getColumnNames(WorkspaceStorageUsage);
    });

    it('has reservedBytes column', () => {
      expect(columns).toContain('reservedBytes');
    });

    it('has usedBytes column', () => {
      expect(columns).toContain('usedBytes');
    });

    it('has organizationId column for scoping', () => {
      expect(columns).toContain('organizationId');
    });

    it('has workspaceId column for scoping', () => {
      expect(columns).toContain('workspaceId');
    });
  });
});
