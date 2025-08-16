// src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

/**
 * Enterprise-safe Postgres SSL handling
 * 
 * This file now uses the centralized SslConfigService logic
 * to ensure consistency with CoreModule configuration.
 */

// Import and use SslConfigService for consistency
import { SslConfigService } from './core/services/ssl-config.service';

const sslConfigService = new SslConfigService();
const sslConfig = sslConfigService.getSslConfig();
const hasDatabaseUrl = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(hasDatabaseUrl
    ? {
        url: process.env.DATABASE_URL, // include ?sslmode=require in the URL
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),
  ssl: sslConfig, // <- final authoritative SSL config for the pg driver
  
  // Entity loading - use proper glob pattern for all entities
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  
  // Runtime entity loading handled by Nest TypeOrmModule; keep migrations here:
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsRun: false,
  synchronize: false,
  logging: ['error'],
});