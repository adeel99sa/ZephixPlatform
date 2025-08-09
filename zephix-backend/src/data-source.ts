import { DataSource } from 'typeorm';

// Simple environment configuration for migration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'malikadeel',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'zephix_dev',
};

const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  entities: [
    'src/users/entities/*.entity.ts',
    'src/organizations/entities/*.entity.ts',
    'src/projects/entities/*.entity.ts',
    'src/pm/entities/*.entity.ts',
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
  ssl: false,
});

export default AppDataSource;
