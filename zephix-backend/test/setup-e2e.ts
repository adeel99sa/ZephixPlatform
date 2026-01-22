/**
 * E2E Test Setup
 * Loads .env.test file before tests run
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file
const envTestPath = path.join(__dirname, '../.env.test');
dotenv.config({ path: envTestPath });

// Also load .env if it exists (for local development)
dotenv.config({ path: path.join(__dirname, '../.env') });

// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Log database URL (without password) for debugging
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`📦 E2E Test Setup: DATABASE_URL=${maskedUrl}`);
} else {
  console.warn('⚠️  E2E Test Setup: DATABASE_URL not set. Tests may fail.');
}

// Diagnostic: Verify pg module is loaded correctly before Nest boot
try {
  const pg = require('pg');
  console.log('📦 E2E Test Setup: pg keys', Object.keys(pg));
  console.log('📦 E2E Test Setup: pg.Pool typeof', typeof pg.Pool);
  if (typeof pg.Pool !== 'function') {
    console.error('❌ E2E Test Setup: pg.Pool is not a function! This will cause TypeORM driver errors.');
    console.error('   pg.Pool value:', pg.Pool);
  } else {
    console.log('✅ E2E Test Setup: pg.Pool is correctly loaded as a function');
  }
} catch (error) {
  console.error('❌ E2E Test Setup: Failed to require pg module:', error);
}



