import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(), // Add this line
  ssl: { rejectUnauthorized: false }, // Critical for Railway
  extra: {
    max: 5,  // Critical for connection limit
    connectionTimeoutMillis: 5000,
  },
  retryAttempts: 3,
  retryDelay: 3000,
  logging: process.env.NODE_ENV === 'production' ? ['error'] : 'all',
};
