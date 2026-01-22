import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';

async function createDocsTable() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway')
      ? { rejectUnauthorized: false }
      : false,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'zephix_user',
    password: process.env.DATABASE_PASSWORD || 'zephix_password',
    database: process.env.DATABASE_NAME || 'zephix_auth_db',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('📝 Creating docs table...');
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

    console.log('📝 Creating indexes...');
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_docs_workspace_created ON docs (workspace_id, created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_docs_workspace_project ON docs (workspace_id, project_id);`,
    );

    console.log('✅ Docs table created successfully');
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating docs table:', error);
    process.exit(1);
  }
}

createDocsTable();
