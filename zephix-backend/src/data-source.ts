import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Environment configuration for migration
const dbConfig = {
  url: process.env.DATABASE_URL, // Railway provides this
  // Fallback for local development
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || 'zephix_secure_password_2024',
  database: process.env.DB_DATABASE || 'zephix_auth_db',
};

const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [
    'src/users/entities/*.entity.ts',
    'src/organizations/entities/*.entity.ts',
    'src/projects/entities/*.entity.ts',
    'src/pm/entities/*.entity.ts',
    'src/pm/status-reporting/entities/*.entity.ts',
    'src/feedback/entities/*.entity.ts',
    'src/brd/entities/*.entity.ts',
  ],
  migrations: [
    'src/database/migrations/*.ts',
    'src/projects/database/migrations/*.ts',
    'src/pm/database/migrations/*.ts',
    'src/organizations/database/migrations/*.ts',
  ],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
