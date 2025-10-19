#!/usr/bin/env bash
set -euo pipefail

echo "Checking for hardcoded API URLs"
violations=$(grep -r -n "http://localhost:3000\|https://api\.getzephix\.com" src || true)
if [ -n "$violations" ]; then
echo "$violations"
echo "Hardcoded API URLs found"
exit 1
fi

echo "Checking for direct fetch outside services/api.ts"
violations=$(grep -r -n "fetch(" src | grep -v "services/api.ts" | grep -v "//" | grep -v "utils/authTestRunner.ts" | grep -v "stores/authStore.ts" | grep -v "utils/audit.ts" | grep -v "components/modals/DemoRequestModal.tsx" | grep -v "services/adminApi.ts" | grep -v "onRetry" || true)
if [ -n "$violations" ]; then
echo "$violations"
echo "Direct fetch calls found"
exit 1
fi

echo "All checks passed"
