import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Environment-aware configuration
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

export const dataSourceOptions = {
  type: 'postgres' as const,
  ...(isProduction && databaseUrl
    ? {
        url: databaseUrl,
        ssl: {
          rejectUnauthorized: false, // Accept Railway's self-signed certificates
        },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'zephix_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'zephix_development',
        ssl: false, // No SSL for local development
      }),
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
