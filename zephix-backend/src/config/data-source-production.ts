import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

// Use production DATABASE_URL
const productionUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

if (!productionUrl) {
  throw new Error('PRODUCTION_DATABASE_URL is required for migration generation');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: productionUrl,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
  ssl: productionUrl.includes('railway') ? { rejectUnauthorized: false } : false,
});
