#!/bin/bash

# Automated Test Database Setup
# Creates test database and user if they don't exist
# This script runs before E2E tests to ensure the test database is ready

set -e

echo "🔧 Setting up test database..."

# Detect CI environment (GitHub Actions, GitLab CI, etc.)
CI_ENV="${CI:-false}"
if [ "$CI_ENV" = "true" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$GITLAB_CI" ]; then
  CI_MODE=true
  echo "🔍 CI mode detected - will fail fast on errors"
else
  CI_MODE=false
  echo "🔍 Local dev mode - will fall back gracefully on errors"
fi

# Default values (can be overridden by environment)
# In CI, use unique database name per run to avoid collisions in matrix runs
if [ -n "$GITHUB_RUN_ID" ]; then
  TEST_DB_NAME="${TEST_DB_NAME:-zephix_test_${GITHUB_RUN_ID}}"
else
  TEST_DB_NAME="${TEST_DB_NAME:-zephix_test}"
fi

# Parse DATABASE_URL FIRST if set to extract connection details
# This ensures parsed values take precedence over defaults
if [ -n "$DATABASE_URL" ] && [ "$CI_MODE" != "true" ]; then
  # Parse DATABASE_URL: postgresql://user:password@host:port/database?query
  # Remove query string first for parsing
  DB_URL_NO_QUERY="${DATABASE_URL%%\?*}"
  if [[ "$DB_URL_NO_QUERY" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER_FROM_URL="${BASH_REMATCH[1]}"
    DB_PASS_FROM_URL="${BASH_REMATCH[2]}"
    DB_HOST_FROM_URL="${BASH_REMATCH[3]}"
    DB_PORT_FROM_URL="${BASH_REMATCH[4]}"
    DB_NAME_FROM_URL="${BASH_REMATCH[5]}"

    # Use parsed values, but allow overrides via env vars
    POSTGRES_USER="${POSTGRES_USER:-$DB_USER_FROM_URL}"
    POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$DB_PASS_FROM_URL}"
    POSTGRES_HOST="${POSTGRES_HOST:-$DB_HOST_FROM_URL}"
    POSTGRES_PORT="${POSTGRES_PORT:-$DB_PORT_FROM_URL}"
    TEST_DB_NAME="${TEST_DB_NAME:-$DB_NAME_FROM_URL}"
    # Use the user from DATABASE_URL for test user
    TEST_DB_USER="${TEST_DB_USER:-$DB_USER_FROM_URL}"
    TEST_DB_PASSWORD="${TEST_DB_PASSWORD:-$DB_PASS_FROM_URL}"
    
    echo "   Parsed from DATABASE_URL:"
    echo "   - User: $POSTGRES_USER"
    echo "   - Host: $POSTGRES_HOST"
    echo "   - Port: $POSTGRES_PORT"
    echo "   - Database: $TEST_DB_NAME"
    echo "   - Test User: $TEST_DB_USER"
  fi
fi

# Set defaults ONLY if not parsed from DATABASE_URL
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Set defaults if not parsed from DATABASE_URL
TEST_DB_USER="${TEST_DB_USER:-zephix_test_user}"
TEST_DB_PASSWORD="${TEST_DB_PASSWORD:-zephix_test_password}"

# Assert required environment variables exist in CI mode
if [ "$CI_MODE" = "true" ]; then
  MISSING_VARS=()
  [ -z "$POSTGRES_HOST" ] && MISSING_VARS+=("POSTGRES_HOST")
  [ -z "$POSTGRES_PORT" ] && MISSING_VARS+=("POSTGRES_PORT")
  [ -z "$POSTGRES_USER" ] && MISSING_VARS+=("POSTGRES_USER")
  [ -z "$POSTGRES_PASSWORD" ] && MISSING_VARS+=("POSTGRES_PASSWORD")

  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ ERROR: Missing required environment variables in CI:"
    printf "   - %s\n" "${MISSING_VARS[@]}"
    echo "   All Postgres connection variables must be set in CI environment"
    exit 1
  fi
fi

# Print redacted connection summary
echo "📋 Connection Summary:"
echo "   Host: ${POSTGRES_HOST}"
echo "   Port: ${POSTGRES_PORT}"
echo "   User: ${POSTGRES_USER}"
echo "   Database: ${TEST_DB_NAME}"
echo "   Password: [REDACTED]"

# Log DATABASE_URL usage
if [ -n "$DATABASE_URL" ] && [ "$CI_MODE" != "true" ]; then
  echo "✅ DATABASE_URL is set - using parsed connection details"
  echo "   Note: In CI, use local Postgres service container, not DATABASE_URL"
fi

# In CI mode, refuse to use DATABASE_URL to prevent pointing at Railway/staging/prod
if [ -n "$DATABASE_URL" ] && [ "$CI_MODE" = "true" ]; then
  echo "❌ ERROR: DATABASE_URL is set in CI environment"
  echo "   CI must use local Postgres service container for isolation"
  echo "   Do not set DATABASE_URL in CI - it risks pointing at staging/prod"
  echo "   Remove DATABASE_URL from CI environment variables"
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  if [ "$CI_MODE" = "true" ]; then
    echo "❌ ERROR: psql not found in CI environment"
    echo "   CI requires psql to be available for database setup"
    exit 1
  else
    echo "⚠️  psql not found. Skipping database setup."
    echo "   Please ensure test database exists manually or set DATABASE_URL"
    exit 0
  fi
fi

# Try to connect to Postgres with retry loop in CI mode
echo "📦 Connecting to Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

if [ "$CI_MODE" = "true" ]; then
  # In CI, wait for Postgres readiness with retry loop
  MAX_RETRIES=10
  RETRY_COUNT=0
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
      echo "✅ Connected to Postgres (attempt $((RETRY_COUNT + 1)))"
      break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⏳ Waiting for Postgres service... ($RETRY_COUNT/$MAX_RETRIES)"
      sleep 2
    fi
  done

  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ ERROR: Cannot connect to Postgres after $MAX_RETRIES retries"
    echo "   Postgres service container must be running and healthy"
    echo "   Check that the Postgres service is configured in the CI workflow"
    exit 1
  fi
else
  # In local dev, try once and fail gracefully
  if ! PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "⚠️  Cannot connect to Postgres. Skipping database setup."
    echo "   Please ensure Postgres is running and accessible"
    echo "   Or set DATABASE_URL to point to your test database"
    exit 0
  fi
  echo "✅ Connected to Postgres"
fi

# Create test user if it doesn't exist
echo "👤 Creating test user '${TEST_DB_USER}' if missing..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres <<EOF 2>/dev/null || true
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '${TEST_DB_USER}') THEN
    CREATE USER ${TEST_DB_USER} WITH PASSWORD '${TEST_DB_PASSWORD}';
    RAISE NOTICE 'User ${TEST_DB_USER} created';
  ELSE
    RAISE NOTICE 'User ${TEST_DB_USER} already exists';
  END IF;
END
\$\$;
EOF

# Create test database if it doesn't exist
echo "💾 Creating test database '${TEST_DB_NAME}' if missing..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres <<EOF 2>/dev/null || true
SELECT 'CREATE DATABASE ${TEST_DB_NAME} OWNER ${TEST_DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TEST_DB_NAME}')\gexec
EOF

# Grant privileges
echo "🔐 Granting privileges..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres <<EOF 2>/dev/null || true
GRANT ALL PRIVILEGES ON DATABASE ${TEST_DB_NAME} TO ${TEST_DB_USER};
ALTER DATABASE ${TEST_DB_NAME} OWNER TO ${TEST_DB_USER};
EOF

# Set DATABASE_URL for subsequent commands
export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${TEST_DB_NAME}?sslmode=disable"

echo "✅ Test database setup complete"
echo "   Database: ${TEST_DB_NAME}"
echo "   User: ${TEST_DB_USER}"
echo "   Connection: ${POSTGRES_HOST}:${POSTGRES_PORT}"

# In CI, export DATABASE_URL and TEST_DB_NAME to GITHUB_ENV
if [ "$CI_MODE" = "true" ] && [ -n "$GITHUB_ENV" ]; then
  echo "DATABASE_URL=${DATABASE_URL}" >> "$GITHUB_ENV"
  echo "TEST_DB_NAME=${TEST_DB_NAME}" >> "$GITHUB_ENV"
  echo "   Exported DATABASE_URL and TEST_DB_NAME to GITHUB_ENV"
fi

