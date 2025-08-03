import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from '../../domain/entities/user.entity';

// Load environment variables
config();

export const createDatabaseConfig = (): DataSourceOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Preferred for Railway and production
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'zephix_auth_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false, // NEVER true in production!
  logging: process.env.DB_LOGGING === 'true',
  entities: [UserEntity],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  subscribers: [__dirname + '/../database/subscribers/*.{ts,js}'],
});

