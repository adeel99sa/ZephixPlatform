#!/usr/bin/env bash
# Reset test database for E2E tests
# Usage: bash scripts/reset-test-db.sh
#
# Environment variables:
#   DATABASE_URL - Required. Connection string to the test database
#   ADMIN_DATABASE_URL - Optional. Connection string with admin privileges for drop/create
#                        If not set, uses DATABASE_URL (must have drop/create permissions)

set -euo pipefail

# Function to mask password in URL
mask_url() {
  echo "$1" | sed -E 's|://([^:]+):([^@]+)@|://\1:****@|'
}

# Function to parse database name from URL
parse_db_name() {
  local url="$1"
  # Remove query string first
  local url_no_query="${url%%\?*}"
  # Extract database name (after last /)
  echo "$url_no_query" | sed -n 's|.*/\([^/]*\)$|\1|p'
}

# Function to parse connection details from URL
parse_db_url() {
  local url="$1"
  # Remove query string
  local url_no_query="${url%%\?*}"
  
  if [[ "$url_no_query" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    echo "${BASH_REMATCH[1]}"  # user
    echo "${BASH_REMATCH[2]}"  # password
    echo "${BASH_REMATCH[3]}"  # host
    echo "${BASH_REMATCH[4]}"  # port
    echo "${BASH_REMATCH[5]}"  # database
  elif [[ "$url_no_query" =~ postgresql://([^:]+)@([^:]+):([^/]+)/(.+) ]]; then
    # No password
    echo "${BASH_REMATCH[1]}"  # user
    echo ""                    # password
    echo "${BASH_REMATCH[2]}"  # host
    echo "${BASH_REMATCH[3]}"  # port
    echo "${BASH_REMATCH[4]}"  # database
  else
    echo "ERROR"
  fi
}

# Check DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set"
  echo "Please set DATABASE_URL environment variable"
  echo "Example: export DATABASE_URL=\"postgresql://user:pass@host:port/dbname\""
  exit 1
fi

# Parse DATABASE_URL
DB_NAME=$(parse_db_name "$DATABASE_URL")

if [ -z "$DB_NAME" ]; then
  echo "❌ Could not extract database name from DATABASE_URL"
  echo "   DATABASE_URL: $(mask_url "$DATABASE_URL")"
  exit 1
fi

# Safety check: database name must contain "test" or "e2e"
if [[ ! "$DB_NAME" =~ (test|e2e|Test|E2E) ]]; then
  echo "❌ Safety check failed: Database name '$DB_NAME' does not contain 'test' or 'e2e'"
  echo "   This script only resets test databases to prevent accidental data loss"
  echo "   If this is a test database, rename it to include 'test' or 'e2e'"
  exit 1
fi

echo "📋 Resetting test database..."
echo "   Database: $DB_NAME"
echo "   Connection: $(mask_url "$DATABASE_URL")"

# Determine admin connection URL
if [ -n "${ADMIN_DATABASE_URL:-}" ]; then
  ADMIN_URL="$ADMIN_DATABASE_URL"
  echo "   Admin connection: $(mask_url "$ADMIN_DATABASE_URL")"
  
  # Parse admin URL to get connection to postgres database
  ADMIN_PARTS=($(parse_db_url "$ADMIN_DATABASE_URL"))
  if [ "${ADMIN_PARTS[0]}" = "ERROR" ]; then
    echo "❌ Could not parse ADMIN_DATABASE_URL"
    exit 1
  fi
  
  ADMIN_USER="${ADMIN_PARTS[0]}"
  ADMIN_PASS="${ADMIN_PARTS[1]}"
  ADMIN_HOST="${ADMIN_PARTS[2]}"
  ADMIN_PORT="${ADMIN_PARTS[3]}"
  
  # Build connection to postgres database
  if [ -n "$ADMIN_PASS" ]; then
    POSTGRES_ADMIN_URL="postgresql://${ADMIN_USER}:${ADMIN_PASS}@${ADMIN_HOST}:${ADMIN_PORT}/postgres"
  else
    POSTGRES_ADMIN_URL="postgresql://${ADMIN_USER}@${ADMIN_HOST}:${ADMIN_PORT}/postgres"
  fi
else
  # Use DATABASE_URL but connect to postgres database
  DB_PARTS=($(parse_db_url "$DATABASE_URL"))
  if [ "${DB_PARTS[0]}" = "ERROR" ]; then
    echo "❌ Could not parse DATABASE_URL"
    exit 1
  fi
  
  DB_USER="${DB_PARTS[0]}"
  DB_PASS="${DB_PARTS[1]}"
  DB_HOST="${DB_PARTS[2]}"
  DB_PORT="${DB_PARTS[3]}"
  
  # Build connection to postgres database
  if [ -n "$DB_PASS" ]; then
    POSTGRES_ADMIN_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/postgres"
  else
    POSTGRES_ADMIN_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/postgres"
  fi
  
  echo "   Using DATABASE_URL for admin operations (must have drop/create permissions)"
fi

echo ""
echo "📋 Connection summary:"
echo "   Test database: $DB_NAME"
echo "   Admin connection: $(mask_url "$POSTGRES_ADMIN_URL")"
echo ""

# Terminate connections and drop/recreate database
echo "📋 Terminating active connections and dropping database..."
psql "$POSTGRES_ADMIN_URL" <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF

echo "📋 Dropping database..."
psql "$POSTGRES_ADMIN_URL" <<EOF
DROP DATABASE IF EXISTS "$DB_NAME";
EOF

echo "📋 Creating database..."
psql "$POSTGRES_ADMIN_URL" <<EOF
CREATE DATABASE "$DB_NAME";
EOF

echo "✅ Database reset complete"
echo ""

# Run migrations using DATABASE_URL
echo "📋 Running migrations..."
cd "$(dirname "$0")/.."

if ! npm run migration:run; then
  echo "❌ Migration failed"
  exit 1
fi

echo "✅ Migrations complete"
echo ""
echo "✅ Test database reset and migrations applied successfully"
