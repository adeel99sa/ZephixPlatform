import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SEC-1 — fix the fail-silent DELETE in the protect_demo_users trigger.
 *
 * `zephix_protect_demo_users()` is a BEFORE DELETE OR UPDATE trigger. It
 * correctly RAISEs for the four seeded demo accounts, but it ends with
 * `RETURN NEW`. In a BEFORE DELETE trigger `NEW` is NULL, and a BEFORE row
 * trigger that returns NULL tells Postgres to SKIP the operation — so the
 * trigger was **silently cancelling every user hard-delete in the system**,
 * not just the four protected demo emails. A customer offboarding a user got a
 * silent no-op with a success response (the same fail-silent family as the
 * null-predicate bugs).
 *
 * Fix: return OLD on DELETE (so the delete proceeds), NEW otherwise. The demo
 * accounts stay undeletable via the explicit RAISE EXCEPTION — an honest error,
 * never a silent skip. Non-demo users now actually delete.
 *
 * Idempotent CREATE OR REPLACE; no schema/data change, transaction-safe.
 */
export class FixDemoUsersDeleteReturnsOld18000000000206
  implements MigrationInterface
{
  name = 'FixDemoUsersDeleteReturnsOld18000000000206';

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
            IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
              RAISE EXCEPTION 'Role change blocked for demo users';
            END IF;
          END IF;
        END IF;
        -- SEC-1: a BEFORE DELETE trigger MUST return OLD; returning NEW (NULL on
        -- DELETE) makes Postgres silently cancel the delete for EVERY row.
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the prior (fail-silent) version from
    // FixProtectDemoUsersTrigger17980243000000. Not recommended — this restores
    // the silent-cancel-all-deletes bug.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zephix_protect_demo_users()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP IN ('DELETE', 'UPDATE') THEN
          IF OLD.email IN ('demo@zephix.ai','admin@zephix.ai','member@zephix.ai','guest@zephix.ai') THEN
            IF TG_OP = 'DELETE' THEN
              RAISE EXCEPTION 'Deletion blocked for demo users';
            END IF;
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
}
