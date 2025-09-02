import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || process.env.USER, // Use your Mac username
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'zephix-dev',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Keep this true to add the new columns
  logging: true,
});
