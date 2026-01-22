import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocsTable1794500000000 implements MigrationInterface {
  name = 'CreateDocsTable1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS docs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL,
        project_id uuid NULL,
        title varchar(200) NOT NULL,
        content text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_docs_workspace_created ON docs (workspace_id, created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_docs_workspace_project ON docs (workspace_id, project_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS docs;`);
  }
}
