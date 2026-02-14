/**
 * Phase 3C: Migration Idempotency Tests
 *
 * Verifies that migration DDL uses proper idempotent patterns.
 */
import { AttachmentRetentionAndMetering18000000000009 } from '../../../migrations/18000000000009-AttachmentRetentionAndMetering';

describe('Migration 18000000000009 Idempotency', () => {
  it('migration class exists and has name', () => {
    const migration = new AttachmentRetentionAndMetering18000000000009();
    expect(migration.name).toBe('AttachmentRetentionAndMetering18000000000009');
  });

  it('up method calls expected DDL statements', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AttachmentRetentionAndMetering18000000000009();
    await migration.up(mockQueryRunner as any);

    // Verify idempotent patterns
    const addColStatements = queries.filter(q => q.includes('ADD COLUMN IF NOT EXISTS'));
    expect(addColStatements.length).toBeGreaterThanOrEqual(3); // retention_days, expires_at, last_downloaded_at, reserved_bytes

    const createIndexStatements = queries.filter(q => q.includes('CREATE INDEX IF NOT EXISTS'));
    expect(createIndexStatements.length).toBeGreaterThanOrEqual(2);

    const constraintStatements = queries.filter(q => q.includes('EXCEPTION WHEN duplicate_object'));
    expect(constraintStatements.length).toBeGreaterThanOrEqual(2); // retention_days check + non-neg checks
  });

  it('down method uses IF EXISTS for all drops', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AttachmentRetentionAndMetering18000000000009();
    await migration.down(mockQueryRunner as any);

    // Every DROP statement should include IF EXISTS
    const dropStatements = queries.filter(q =>
      q.includes('DROP') && !q.includes('IF EXISTS'),
    );
    expect(dropStatements.length).toBe(0);
  });

  it('up DDL includes reserved_bytes column', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AttachmentRetentionAndMetering18000000000009();
    await migration.up(mockQueryRunner as any);

    const reservedBytesStatement = queries.find(q => q.includes('reserved_bytes'));
    expect(reservedBytesStatement).toBeDefined();
  });

  it('up DDL includes retention_days CHECK constraint', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AttachmentRetentionAndMetering18000000000009();
    await migration.up(mockQueryRunner as any);

    const retentionCheck = queries.find(
      q => q.includes('CHK_attachments_retention_days') && q.includes('3650'),
    );
    expect(retentionCheck).toBeDefined();
  });

  it('up DDL includes non-negative checks for storage usage', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    };

    const migration = new AttachmentRetentionAndMetering18000000000009();
    await migration.up(mockQueryRunner as any);

    const usedNonneg = queries.find(q => q.includes('CHK_storage_used_nonneg'));
    const reservedNonneg = queries.find(q => q.includes('CHK_storage_reserved_nonneg'));
    expect(usedNonneg).toBeDefined();
    expect(reservedNonneg).toBeDefined();
  });
});
