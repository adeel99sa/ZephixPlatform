#!/usr/bin/env bash
# Reset test database for E2E tests
# Usage: bash scripts/reset-test-db.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set"
  echo "Please set DATABASE_URL environment variable"
  echo "Example: export DATABASE_URL=\"postgresql://user:pass@host:port/dbname\""
  exit 1
fi

echo "📋 Resetting test database..."

# Extract database name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
  echo "❌ Could not extract database name from DATABASE_URL"
  exit 1
fi

echo "📋 Database name: $DB_NAME"

# Connect to postgres database to drop/recreate
POSTGRES_URL=$(echo "$DATABASE_URL" | sed "s|/${DB_NAME}|/postgres|")

echo "📋 Dropping and recreating database..."
psql "$POSTGRES_URL" <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS "$DB_NAME";
CREATE DATABASE "$DB_NAME";
EOF

echo "✅ Database reset complete"
echo "📋 Running migrations..."

cd "$(dirname "$0")/.."
npm run migration:run

echo "✅ Migrations complete"

