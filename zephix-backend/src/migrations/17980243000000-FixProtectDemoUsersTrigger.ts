import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix the protect_demo_users trigger that references a non-existent
 * `deleted_at` column on the `users` table.
 *
 * The original trigger (ProtectDemoUsers1762200000001) guards demo users
 * against deletion and role changes, but it also checks `NEW.deleted_at`
 * which doesn't exist — causing EVERY user UPDATE (including login's
 * last_login_at bump) to crash with:
 *
 *   ERROR: record "new" has no field "deleted_at"
 *
 * This migration replaces the trigger function with a corrected version
 * that removes the `deleted_at` reference.
 */
export class FixProtectDemoUsersTrigger17980243000000
  implements MigrationInterface
{
  name = 'FixProtectDemoUsersTrigger17980243000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zephix_protect_demo_users()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP IN ('DELETE', 'UPDATE') THEN
          IF OLD.email IN ('demo@zephix.ai','admin@zephix.ai','member@zephix.ai','guest@zephix.ai') THEN
            IF TG_OP = 'DELETE' THEN
              RAISE EXCEPTION 'Deletion blocked for demo users';
            END IF;
            -- Only block role changes; do NOT reference deleted_at (column does not exist)
            IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
              RAISE EXCEPTION 'Role change blocked for demo users';
            END IF;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original (broken) version — not recommended
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zephix_protect_demo_users()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP IN ('DELETE', 'UPDATE') THEN
          IF OLD.email IN ('demo@zephix.ai','admin@zephix.ai','member@zephix.ai','guest@zephix.ai') THEN
            IF TG_OP = 'DELETE' THEN
              RAISE EXCEPTION 'Deletion blocked for demo users';
            END IF;
            IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.deleted_at IS NOT NULL) THEN
              RAISE EXCEPTION 'Role change / soft-delete blocked for demo users';
            END IF;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}
