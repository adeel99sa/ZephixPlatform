// test-db.ts
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    const AppDataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://malikadeel@localhost:5432/zephix_development',
      synchronize: false,
      logging: true,
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/migrations/*.ts'],
    });

    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    
    const migrations = await AppDataSource.showMigrations();
    console.log('Pending migrations:', migrations);
    
    const tables = await AppDataSource.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log('Existing tables:', tables.map(t => t.tablename));
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
