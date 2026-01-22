#!/bin/bash
# Load .env.test and execute command
# Usage: ./scripts/load-test-env.sh <command>

set -e

# Check if .env.test exists
if [ ! -f .env.test ]; then
  echo "❌ Error: .env.test file not found"
  echo "   Create it with DATABASE_URL and JWT_SECRET from Railway zephix-postgres-test"
  exit 1
fi

# Load .env.test
export $(cat .env.test | grep -v '^#' | xargs)

# Guardrail: Prevent production DB usage
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not set in .env.test"
  exit 1
fi

# Check for production database indicators (adjust hostname pattern as needed)
if echo "$DATABASE_URL" | grep -qE "(production|prod|main)"; then
  echo "❌ ERROR: DATABASE_URL appears to be production database!"
  echo "   This script only works with test database (zephix-postgres-test)"
  exit 1
fi

# Verify NODE_ENV is test
if [ "$NODE_ENV" != "test" ]; then
  echo "❌ Error: NODE_ENV must be 'test', got: $NODE_ENV"
  exit 1
fi

# Execute the command
# Use npx to ensure jest is found in node_modules/.bin
if [ "$1" = "jest" ]; then
  shift
  exec npx jest "$@"
else
  exec "$@"
fi
