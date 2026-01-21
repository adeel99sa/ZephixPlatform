import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add composite indexes for auth_outbox claim and retry queries
 * 
 * Indexes added:
 * - idx_auth_outbox_pending_claim: (status, next_attempt_at, created_at)
 *   Supports: WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= $1) ORDER BY created_at ASC
 * 
 * - idx_auth_outbox_failed_retry: (status, next_attempt_at, attempts, created_at)
 *   Supports: WHERE status = 'failed' AND next_attempt_at <= $1 AND attempts < $2 ORDER BY created_at ASC
 * 
 * These indexes optimize the OutboxProcessorService queries that run every minute.
 */
export class AddAuthOutboxCompositeIndexes1796000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for pending events claim query
    // Matches: WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= $1) ORDER BY created_at ASC
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_outbox_pending_claim 
      ON auth_outbox(status, next_attempt_at, created_at)
      WHERE status = 'pending';
    `);

    // Index for failed events retry query
    // Matches: WHERE status = 'failed' AND next_attempt_at <= $1 AND attempts < $2 ORDER BY created_at ASC
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_outbox_failed_retry 
      ON auth_outbox(status, next_attempt_at, attempts, created_at)
      WHERE status = 'failed';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_auth_outbox_failed_retry;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_auth_outbox_pending_claim;
    `);
  }
}
