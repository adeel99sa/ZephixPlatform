import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProtectDemoUsers1762200000001 implements MigrationInterface {
  name = 'ProtectDemoUsers1762200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zephix_protect_demo_users()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP IN ('DELETE', 'UPDATE') THEN
          IF OLD.email IN ('demo@zephix.ai','admin@zephix.ai','member@zephix.ai','guest@zephix.ai') THEN
            -- allow updating password/last_login, but block destructive changes
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

      DROP TRIGGER IF EXISTS trg_protect_demo_users ON users;
      CREATE TRIGGER trg_protect_demo_users
      BEFORE UPDATE OR DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION zephix_protect_demo_users();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_protect_demo_users ON users;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS zephix_protect_demo_users();`,
    );
  }
}
