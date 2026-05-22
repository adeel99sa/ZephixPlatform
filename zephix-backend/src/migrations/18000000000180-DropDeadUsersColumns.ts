import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A10 — drop six dead columns on `users`.
 *
 * Two of these were explicitly marked `@deprecated` in the entity
 * (`two_factor_enabled`, `two_factor_secret`) and were waiting for the
 * cutover drop migration since B1. The other four (`email_verification_token`,
 * `email_verification_expires`, `password_reset_token`,
 * `password_reset_expires`) are inline columns that pre-date the dedicated
 * `email_verification_tokens` and `password_reset_tokens` tables;
 * production code reads from those dedicated tables exclusively, so the
 * inline User columns are dead.
 *
 * Pre-drop usage audit (zero non-entity, non-spec, non-migration reads):
 *   two_factor_enabled       — replaced by mfa_enabled
 *   two_factor_secret        — replaced by mfa_secret_ciphertext set
 *   email_verification_token — replaced by email_verification_tokens table
 *   email_verification_expires — replaced by email_verification_tokens table
 *   password_reset_token     — replaced by password_reset_tokens table
 *   password_reset_expires   — replaced by password_reset_tokens table
 *
 * NOT dropped (active usage):
 *   is_email_verified, email_verified_at — read by 20+ call sites
 *   last_password_change                 — written on invitation accept
 *   mfa_* columns                        — current B1 MFA implementation
 *
 * Down: restores the columns as nullable with no default. Reverse is
 * structural-only — the data is gone and not recoverable.
 */
export class DropDeadUsersColumns18000000000180 implements MigrationInterface {
  name = 'DropDeadUsersColumns18000000000180';

  private readonly droppedColumns: Array<{
    name: string;
    sqlType: string;
    sqlDefault?: string;
  }> = [
    { name: 'two_factor_enabled', sqlType: 'boolean', sqlDefault: 'false' },
    { name: 'two_factor_secret', sqlType: 'varchar' },
    { name: 'email_verification_token', sqlType: 'varchar' },
    { name: 'email_verification_expires', sqlType: 'timestamp' },
    { name: 'password_reset_token', sqlType: 'varchar' },
    { name: 'password_reset_expires', sqlType: 'timestamp' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of this.droppedColumns) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN IF EXISTS "${col.name}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of this.droppedColumns) {
      const defaultClause = col.sqlDefault ? ` DEFAULT ${col.sqlDefault}` : '';
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.sqlType}${defaultClause}`,
      );
    }
  }
}
