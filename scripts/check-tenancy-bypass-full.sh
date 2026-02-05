#!/bin/bash
# Check for tenant scoping bypass patterns in CHANGED files only (regression guard)
# Full backend version - checks all changed backend files, not just modules

set -e

echo "🔍 Tenancy bypass regression guard - full backend (changed files only)..."

# Fetch main for comparison
git fetch origin main:refs/remotes/origin/main 2>/dev/null || true

# Get changed backend source files (excluding migrations, tenancy, database, tests)
CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null \
  | grep -E '^zephix-backend/src/.*\.ts$' \
  | grep -v 'migrations/' \
  | grep -v 'src/modules/tenancy/' \
  | grep -v 'src/database/' \
  | grep -v '\.spec\.ts$' \
  | grep -v '\.test\.ts$' || true)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No backend source changes. Skipping tenancy bypass scan."
  exit 0
fi

echo "   Scanning $(echo "$CHANGED_FILES" | wc -l | tr -d ' ') changed files..."

# Patterns to check
BANNED='@InjectRepository\(|getRepository\(|DataSource\.getRepository|manager\.getRepository|createQueryBuilder\(|dataSource\.query|manager\.query|createQueryRunner'

EXIT_CODE=0

# Check each changed file
for file in $CHANGED_FILES; do
  if [ -f "$file" ]; then
    MATCHES=$(grep -n -E "$BANNED" "$file" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      echo "❌ Found forbidden pattern in $file:"
      echo "$MATCHES" | while IFS= read -r line; do
        echo "   $line"
      done
      EXIT_CODE=1
    fi
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ No new bypass patterns in changed files"
else
  echo ""
  echo "❌ New tenant scoping bypass patterns detected in changed files!"
  echo "   Use TenantAwareRepository instead of direct TypeORM repository access."
  echo "   For scripts and background jobs, use runWithTenant helper."
  echo "   See docs/PHASE2A_MIGRATION_PLAYBOOK.md for migration guide."
fi

exit $EXIT_CODE
