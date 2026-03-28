import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Safety-net migration: ensures audit_events table matches Phase 3B entity schema.
 *
 * Root cause: work-management AuditEvent entity used Sprint 5 column names
 * (user_id, event_type, project_id, old_state, new_state, metadata) while
 * the DB already has Phase 3B columns (organization_id, actor_user_id,
 * actor_platform_role, action, before_json, after_json, metadata_json).
 *
 * This migration is idempotent — it only adds columns that are missing
 * and makes stale Sprint 5 columns nullable so they don't block inserts.
 */
export class AlignAuditEventsEntitySchema17980242000000
  implements MigrationInterface
{
  name = 'AlignAuditEventsEntitySchema17980242000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Ensure Phase 3B required columns exist ─────────────────────
    const ensureColumn = async (
      col: string,
      type: string,
      nullable: boolean,
      defaultVal?: string,
    ) => {
      const exists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_events'
          AND column_name = '${col}'
        LIMIT 1
      `);
      if (!exists?.length) {
        const nullClause = nullable ? '' : ' NOT NULL';
        const defClause = defaultVal ? ` DEFAULT ${defaultVal}` : '';
        await queryRunner.query(
          `ALTER TABLE audit_events ADD COLUMN "${col}" ${type}${nullClause}${defClause}`,
        );
      }
    };

    // Phase 3B required columns
    await ensureColumn('organization_id', 'uuid', false, "'00000000-0000-0000-0000-000000000000'");
    await ensureColumn('actor_user_id', 'uuid', false, "'00000000-0000-0000-0000-000000000000'");
    await ensureColumn('actor_platform_role', 'varchar(30)', false, "'UNKNOWN'");
    await ensureColumn('action', 'varchar(40)', false, "'UNKNOWN'");
    await ensureColumn('entity_type', 'varchar(40)', false, "'UNKNOWN'");
    await ensureColumn('entity_id', 'uuid', true);
    await ensureColumn('before_json', 'jsonb', true);
    await ensureColumn('after_json', 'jsonb', true);
    await ensureColumn('metadata_json', 'jsonb', true);
    await ensureColumn('actor_workspace_role', 'varchar(50)', true);
    await ensureColumn('ip_address', 'varchar(45)', true);
    await ensureColumn('user_agent', 'varchar(512)', true);

    // ── Make stale Sprint 5 columns nullable if they exist ─────────
    const makeNullable = async (col: string) => {
      const exists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_events'
          AND column_name = '${col}'
          AND is_nullable = 'NO'
        LIMIT 1
      `);
      if (exists?.length) {
        await queryRunner.query(
          `ALTER TABLE audit_events ALTER COLUMN "${col}" DROP NOT NULL`,
        );
      }
    };

    // Sprint 5 columns that may still exist with NOT NULL
    await makeNullable('user_id');
    await makeNullable('event_type');
    await makeNullable('project_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Forward-only: no destructive rollback. Columns remain.
  }
}
