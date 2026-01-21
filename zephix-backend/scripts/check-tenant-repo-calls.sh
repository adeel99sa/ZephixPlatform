#!/bin/bash
# Check for TenantAwareRepository calls without explicit orgId parameter
# This enforces the new signature: all methods require orgId as first parameter

set -e

echo "🔍 Checking for TenantAwareRepository calls without explicit orgId..."

# Patterns to check - these should have orgId as first parameter
PATTERNS=(
  "\.find\("
  "\.save\("
  "\.findOne\("
  "\.findAndCount\("
  "\.count\("
  "\.saveMany\("
  "\.create\("
  "\.update\("
  "\.delete\("
  "\.qb\("
  "\.findByIds\("
)

# Allowlist - files that are allowed to use legacy ALS calls
ALLOWLIST=(
  "tenant-context.service.spec.ts"
  "tenant-aware.repository.ts"
  "tenant-aware-repository.provider.ts"
  ".spec.ts"
  ".test.ts"
  ".e2e-spec.ts"
  "scripts/"
  "migrations/"
)

ERRORS=0
FILES_CHECKED=0

# Check each pattern
for pattern in "${PATTERNS[@]}"; do
  # Find all TypeScript files in src/modules
  while IFS= read -r file; do
    # Skip if file is in allowlist
    skip=false
    for allowed in "${ALLOWLIST[@]}"; do
      if [[ "$file" == *"$allowed"* ]]; then
        skip=true
        break
      fi
    done
    
    if [ "$skip" = true ]; then
      continue
    fi
    
    FILES_CHECKED=$((FILES_CHECKED + 1))
    
    # Check for calls that don't start with orgId/organizationId
    # We want to catch: repo.find({ where: ... }) but allow: repo.find(orgId, { where: ... })
    # Also catch: repo.saveMany([...]) but allow: repo.saveMany(orgId, [...])
    # Also catch: repo.update(id, {...}) but allow: repo.update(orgId, id, {...})
    # Also catch: repo.delete(id) but allow: repo.delete(orgId, id)
    # Also catch: repo.qb('alias') but allow: repo.qb(orgId, 'alias')
    # Also catch: repo.findByIds([...]) but allow: repo.findByIds(orgId, [...])
    
    if grep -n "$pattern" "$file" 2>/dev/null | grep -vE "(orgId|organizationId|'[^']+',|\"[^\"]+\",|orgIdOr)" > /dev/null; then
      # More precise check: look for calls that start with {, [, ', ", or variable name (not orgId)
      # Pattern: method( followed by {, [, ', ", or identifier that's not orgId
      if grep -n "$pattern" "$file" 2>/dev/null | grep -E "\([[:space:]]*\{|\([[:space:]]*\[|\([[:space:]]*'[^']*'|\([[:space:]]*\"[^\"]*\"|\([[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*," | grep -vE "(orgId|organizationId)" > /dev/null; then
        echo "❌ $file: Found potential call without orgId parameter"
        grep -n "$pattern" "$file" 2>/dev/null | grep -E "\([[:space:]]*\{|\([[:space:]]*\[|\([[:space:]]*'[^']*'|\([[:space:]]*\"[^\"]*\"|\([[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*," | grep -vE "(orgId|organizationId)" | head -3 || true
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done < <(find src/modules -name "*.ts" -type f 2>/dev/null | grep -v node_modules)
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "❌ Found $ERRORS potential TenantAwareRepository calls without explicit orgId"
  echo "   All methods now require orgId as first parameter:"
  echo "   - find(orgId, options)"
  echo "   - findOne(orgId, options)"
  echo "   - saveMany(orgId, entities)"
  echo "   - create(orgId, entityLike)"
  echo "   - update(orgId, criteria, partialEntity)"
  echo "   - delete(orgId, criteria)"
  echo "   - qb(orgId, alias)"
  echo "   - findByIds(orgId, ids)"
  echo "   See docs/CONTRIBUTING_TENANT_CONTEXT.md for details"
  exit 1
else
  echo ""
  echo "✅ All TenantAwareRepository calls appear to use explicit orgId parameter"
  echo "   Checked $FILES_CHECKED files"
  exit 0
fi
