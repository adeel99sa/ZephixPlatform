import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTaskUserReferences1757255642228 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add foreign key constraints if they don't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_task_assigned_to'
        ) THEN
          ALTER TABLE tasks 
          ADD CONSTRAINT fk_task_assigned_to 
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_task_created_by'
        ) THEN
          ALTER TABLE tasks 
          ADD CONSTRAINT fk_task_created_by 
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Same for task_comments
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_comment_user'
        ) THEN
          ALTER TABLE task_comments 
          ADD CONSTRAINT fk_comment_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_task_assigned_to;
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_task_created_by;
      ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS fk_comment_user;
    `);
  }
}