// src/data-source.ts - Enterprise-Grade PostgreSQL Configuration
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';

// Load environment variables
config();

// Environment configuration for migration
const dbConfig = {
  url: process.env.DATABASE_URL, // Railway provides this
  // Fallback for local development only when DATABASE_URL is not available
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || 'zephix_secure_password_2024',
  database: process.env.DB_DATABASE || 'zephix_auth_db',
};

const AppDataSource = new DataSource({
  type: 'postgres',
  // Use DATABASE_URL if available, otherwise fall back to individual parameters
  ...(dbConfig.url
    ? { url: dbConfig.url }
    : {
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
      }),
  entities: [User, RefreshToken],
  migrations: [
    'src/database/migrations/*.ts',
    'src/projects/database/migrations/*.ts',
    'src/pm/database/migrations/*.ts',
    'src/organizations/database/migrations/*.ts',
  ],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
  ssl:
    process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
