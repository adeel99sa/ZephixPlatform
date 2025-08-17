import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const dataSourceOptions = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  ssl: {
    rejectUnauthorized: true, // CRITICAL: Never disable SSL validation
  },
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
