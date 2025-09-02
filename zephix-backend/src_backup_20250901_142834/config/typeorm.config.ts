import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgresql://malikadeel@localhost:5432/zephix_development',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});
