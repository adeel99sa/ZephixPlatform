import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AddLastLoginAtToUser1755841000000 } from '../src/database/migrations/1755841000000-AddLastLoginAtToUser';

// Load environment variables
config();

async function runMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'zephix_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'zephix_development',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: true,
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected');

    console.log('🚀 Running migration: AddLastLoginAtToUser...');
    const migration = new AddLastLoginAtToUser1755841000000();
    await migration.up(dataSource.createQueryRunner());
    console.log('✅ Migration completed successfully');

    // Update admin user role
    console.log('🔧 Updating admin user role...');
    await dataSource.query(
      "UPDATE users SET role = 'admin' WHERE email = 'admin@zephix.ai'"
    );
    console.log('✅ Admin user role updated');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

runMigration();
