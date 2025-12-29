#!/bin/bash
# Check for tenant scoping bypass patterns across entire backend
# This is a comprehensive scan that covers scripts, tests, and legacy modules
# Exceptions: migrations, infrastructure modules, node_modules, dist

set -e

# Support running from project root or zephix-backend directory
if [ -d "zephix-backend/src" ]; then
  BACKEND_DIR="zephix-backend"
elif [ -d "src" ]; then
  BACKEND_DIR="."
else
  echo "❌ Error: Cannot find backend directory"
  exit 1
fi

EXIT_CODE=0

# Patterns to check (grep -E compatible)
PATTERNS=(
  "@InjectRepository\\("
  "getRepository\\("
  "DataSource\\.getRepository"
  "manager\\.getRepository"
  "createQueryBuilder\\("
  "dataSource\\.query"
  "manager\\.query"
  "createQueryRunner"
)

echo "🔍 Checking for tenant scoping bypass patterns across entire backend..."

# Directories to exclude (infrastructure and generated)
EXCLUDE_DIRS=(
  "node_modules"
  "dist"
  "migrations"
  "src/modules/tenancy"
  "src/database"
  ".git"
)

# Build exclude pattern for grep
EXCLUDE_PATTERN=""
for dir in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_PATTERN="${EXCLUDE_PATTERN} --exclude-dir=${dir}"
done

# Check each pattern
for pattern in "${PATTERNS[@]}"; do
  echo "  Checking pattern: ${pattern}"

  # Search in backend directory, excluding allowed dirs
  MATCHES=$(grep -r -E "${pattern}" "${BACKEND_DIR}" \
    --include="*.ts" \
    ${EXCLUDE_PATTERN} \
    2>/dev/null || true)

  if [ -n "$MATCHES" ]; then
    echo "❌ Found forbidden pattern '${pattern}' in:"
    echo "$MATCHES" | while IFS= read -r line; do
      echo "   $line"
    done
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ No bypass patterns found"
else
  echo ""
  echo "❌ Tenant scoping bypass patterns detected!"
  echo "   Use TenantAwareRepository instead of direct TypeORM repository access."
  echo "   For scripts and background jobs, use runWithTenant helper."
  echo "   See docs/PHASE2A_MIGRATION_PLAYBOOK.md for migration guide."
fi

exit $EXIT_CODE


