#!/bin/bash
# Safety net: Detect bad codemod rewrites to regular Repository calls
# This catches cases where orgId was incorrectly added to transaction manager repos

set -e

echo "🔍 Checking for bad rewrites to regular Repository calls..."

ERRORS=0

# Pattern 1: getRepository(...).method(orgId, ...
BAD_PATTERNS=(
  "getRepository\(.*\)\.create\(orgId,"
  "getRepository\(.*\)\.save\(orgId,"
  "getRepository\(.*\)\.update\(orgId,"
  "getRepository\(.*\)\.delete\(orgId,"
  "getRepository\(.*\)\.qb\(orgId,"
  "getRepository\(.*\)\.findByIds\(orgId,"
  "manager\.getRepository\(.*\)\.create\(orgId,"
  "manager\.getRepository\(.*\)\.save\(orgId,"
  "manager\.getRepository\(.*\)\.update\(orgId,"
  "manager\.getRepository\(.*\)\.delete\(orgId,"
  "queryRunner\.manager\.getRepository\(.*\)\.create\(orgId,"
  "queryRunner\.manager\.getRepository\(.*\)\.save\(orgId,"
  "dataSource\.getRepository\(.*\)\.create\(orgId,"
  "dataSource\.getRepository\(.*\)\.save\(orgId,"
)

for pattern in "${BAD_PATTERNS[@]}"; do
  matches=$(grep -rn "$pattern" src --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | grep -v ".test.ts" | grep -v ".e2e-spec.ts" | wc -l | tr -d ' ')
  
  if [ "$matches" -gt 0 ]; then
    echo "❌ Found $matches bad rewrite(s) matching pattern: $pattern"
    grep -rn "$pattern" src --include="*.ts" 2>/dev/null | grep -v ".spec.ts" | grep -v ".test.ts" | grep -v ".e2e-spec.ts" | head -5
    ERRORS=$((ERRORS + matches))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "❌ Found $ERRORS bad rewrites to regular Repository calls"
  echo "   These should NOT have orgId parameter (they're not TenantAwareRepository)"
  echo "   Fix by removing orgId from these calls"
  exit 1
else
  echo "✅ No bad rewrites detected"
  exit 0
fi
