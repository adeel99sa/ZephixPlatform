#!/bin/bash
# CI guardrail: Block truthy checks on boolean environment variables
# 
# Prevents regressions where code treats string "false" as truthy.
# All boolean env vars must use explicit "true" checks via isTrue() helper.

set -e

echo "🔍 Checking for truthy environment variable checks..."

# List of boolean environment variables that must use explicit checks
BOOLEAN_ENV_VARS=(
  "REQUEST_CONTEXT_LOGGER_ENABLED"
  "OUTBOX_PROCESSOR_ENABLED"
  "TYPEORM_LOGGING"
  "SKIP_DATABASE"
  "SKIP_EMAIL_VERIFICATION"
)

VIOLATIONS=0

for env_var in "${BOOLEAN_ENV_VARS[@]}"; do
  # Find truthy checks (if (process.env.VAR) or !!process.env.VAR)
  # Exclude comments and isTrue() helper usage
  TRUTHY_CHECKS=$(grep -rn "if.*process\.env\.${env_var})" src --include="*.ts" \
    | grep -v "isTrue\|//.*${env_var}\|/\*.*${env_var}" \
    | grep -v "===.*true\|!==.*true\|toLowerCase.*===.*true" || true)
  
  DOUBLE_NEG_CHECKS=$(grep -rn "!!process\.env\.${env_var}" src --include="*.ts" \
    | grep -v "isTrue\|//.*${env_var}\|/\*.*${env_var}" || true)
  
  if [ -n "$TRUTHY_CHECKS" ] || [ -n "$DOUBLE_NEG_CHECKS" ]; then
    echo ""
    echo "❌ ERROR: Found truthy check for ${env_var}"
    echo ""
    echo "Truthy checks treat string 'false' as true. Use explicit check instead:"
    echo ""
    echo "  ❌ WRONG:"
    echo "    if (process.env.${env_var}) { ... }"
    echo "    if (!!process.env.${env_var}) { ... }"
    echo ""
    echo "  ✅ CORRECT:"
    echo "    const isTrue = (v?: string): boolean => (v || '').toLowerCase() === 'true';"
    echo "    if (isTrue(process.env.${env_var})) { ... }"
    echo ""
    if [ -n "$TRUTHY_CHECKS" ]; then
      echo "Found in:"
      echo "$TRUTHY_CHECKS"
    fi
    if [ -n "$DOUBLE_NEG_CHECKS" ]; then
      echo "Found double negation:"
      echo "$DOUBLE_NEG_CHECKS"
    fi
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo ""
  echo "❌ Found $VIOLATIONS violation(s). Fix before merging."
  exit 1
fi

echo "✅ All boolean environment variable checks use explicit 'true' comparison"
exit 0
