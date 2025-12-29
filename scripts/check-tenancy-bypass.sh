#!/bin/bash
# Check for tenant scoping bypass patterns in modules
# This script fails if forbidden patterns are found in src/modules/**
# Exceptions: tenancy/** and database/** modules are allowed

set -e

# Support running from project root or zephix-backend directory
if [ -d "zephix-backend/src/modules" ]; then
  MODULES_DIR="zephix-backend/src/modules"
elif [ -d "src/modules" ]; then
  MODULES_DIR="src/modules"
else
  echo "❌ Error: Cannot find src/modules directory"
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

echo "🔍 Checking for tenant scoping bypass patterns in ${MODULES_DIR}..."

# Check each pattern
for pattern in "${PATTERNS[@]}"; do
  echo "  Checking pattern: ${pattern}"

  # Search in modules directory, excluding allowed dirs
  MATCHES=$(grep -r -E "${pattern}" "${MODULES_DIR}" \
    --include="*.ts" \
    --exclude-dir=tenancy \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
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
  echo "   See docs/PHASE2A_MIGRATION_PLAYBOOK.md for migration guide."
fi

exit $EXIT_CODE


