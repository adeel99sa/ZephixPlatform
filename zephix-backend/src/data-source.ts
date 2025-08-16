// src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

/**
 * Enterprise-safe Postgres SSL handling
 *
 * Supports:
 * - DATABASE_URL (preferred) with ?sslmode=require|verify-full
 * - or discrete DB_* variables
 * TLS:
 * - DB_SSL=disable            -> ssl: false
 * - DB_SSL=require (default)  -> ssl: { rejectUnauthorized: false }  (works with self-signed chains)
 * - DB_SSL_STRICT=true        -> ssl: { rejectUnauthorized: true, ca?: <decoded CA PEM> }
 * - DB_SSL_CA                 -> optional base64-OR-plain PEM (only used when STRICT=true)
 */

function decodeMaybeBase64(input?: string): string | undefined {
  if (!input) return undefined;
  try {
    // if it decodes cleanly and looks like PEM, keep it
    const out = Buffer.from(input, 'base64').toString('utf8');
    if (out.includes('-----BEGIN') && out.includes('-----END')) return out;
    // otherwise assume original was plain PEM
    return input;
  } catch {
    return input;
  }
}

const DB_SSL = (process.env.DB_SSL || 'require').toLowerCase(); // disable | require
const DB_SSL_STRICT = (process.env.DB_SSL_STRICT || 'false').toLowerCase() === 'true';
const DB_SSL_CA = decodeMaybeBase64(process.env.DB_SSL_CA);

const ssl =
  DB_SSL === 'disable'
    ? false
    : DB_SSL_STRICT
    ? { rejectUnauthorized: true, ca: DB_SSL_CA }
    : { rejectUnauthorized: false };

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
  ssl, // <- final authoritative SSL config for the pg driver
  // Runtime entity loading handled by Nest TypeOrmModule; keep migrations here:
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsRun: false,
  synchronize: false,
  logging: ['error'],
});