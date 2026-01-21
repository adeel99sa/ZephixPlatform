/**
 * PHASE 7.4.3: Test Database Guardrail
 * Prevents accidental use of production database in tests
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test if NODE_ENV is test
if (process.env.NODE_ENV === 'test') {
  const envPath = path.resolve(__dirname, '../.env.test');
  dotenv.config({ path: envPath });
}

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV;

// Guardrail checks
if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set');
  process.exit(1);
}

if (NODE_ENV !== 'test') {
  console.error(`❌ ERROR: NODE_ENV must be 'test', got: ${NODE_ENV}`);
  process.exit(1);
}

// Check for production database indicators
const productionIndicators = ['production', 'prod', 'main'];
const dbUrlLower = DATABASE_URL.toLowerCase();

for (const indicator of productionIndicators) {
  if (dbUrlLower.includes(indicator)) {
    console.error(`❌ ERROR: DATABASE_URL contains '${indicator}' - appears to be production database!`);
    console.error('   This script only works with test database (zephix-postgres-test)');
    process.exit(1);
  }
}

// Extract and verify hostname
const hostMatch = DATABASE_URL.match(/@([^:]+):/);
if (hostMatch) {
  const hostname = hostMatch[1];
  console.log(`✅ Test database guardrail passed`);
  console.log(`   Host: ${hostname}`);
  console.log(`   NODE_ENV: ${NODE_ENV}`);
} else {
  console.warn('⚠️  Could not extract hostname from DATABASE_URL');
}
