import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  
  // Relying on DATABASE_URL is standard for cloud providers like Railway
  url: process.env.DATABASE_URL,
  
  // Set SSL configuration for production environments
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  
  // Log queries only when not in production
  logging: process.env.NODE_ENV !== 'production',
  
  // This is the critical fix. This pattern automatically finds all files
  // in your project ending in .entity.ts (for dev) or .entity.js (for prod).
  entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
  
  // A robust path for finding migration files
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],

  // It's crucial that synchronize is false for production
  synchronize: false, 
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;