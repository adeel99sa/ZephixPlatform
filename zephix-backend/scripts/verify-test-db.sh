#!/bin/bash
# Quick verification that test database is accessible and has tables
# Usage: ./scripts/verify-test-db.sh

set -e

# Load .env.test
if [ ! -f .env.test ]; then
  echo "❌ Error: .env.test file not found"
  exit 1
fi

export $(cat .env.test | grep -v '^#' | xargs)

# Guardrail checks
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not set in .env.test"
  exit 1
fi

if echo "$DATABASE_URL" | grep -qE "(production|prod|main)"; then
  echo "❌ ERROR: DATABASE_URL appears to be production database!"
  exit 1
fi

# Extract hostname from DATABASE_URL for verification
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
echo "✅ Connecting to test database host: ${DB_HOST}"

# Use node to run a quick TypeORM query
node -e "
const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});
ds.initialize()
  .then(async () => {
    const result = await ds.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \\'public\\' LIMIT 5');
    console.log('✅ Database connected successfully');
    console.log('✅ Found tables:', result.map(r => r.table_name).join(', '));
    await ds.destroy();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"
