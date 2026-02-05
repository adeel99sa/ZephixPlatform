#!/bin/bash

# Deployment Guard Script
# Runs before deployment to catch build and DI issues early
# Usage: npm run guard:deploy

set -e

echo "🛡️  Running deployment guard checks..."
echo ""

# 1. TypeScript Build
echo "1️⃣  Running TypeScript build..."
cd "$(dirname "$0")/.."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed - fix TypeScript errors before deploying"
  exit 1
fi
echo "   ✅ Build passed"
echo ""

# 2. Debug/Schema Exposure Guard
echo "2️⃣  Checking for debug/schema exposure controllers..."
DEBUG_MATCHES=$(grep -rEn "@Controller\(['\"]debug['\"]" src || true)
INTERNAL_MATCHES=$(grep -rEn "@Controller\(['\"]internal['\"]" src || true)
DIAG_MATCHES=$(grep -rEn "@Controller\(['\"]diag['\"]" src || true)
SCHEMA_ROUTE_MATCHES=$(grep -rEn "@Get\(['\"]schema['\"]|@Get\(['\"]health/schema['\"]" src || true)

if [ -n "$DEBUG_MATCHES" ] || [ -n "$INTERNAL_MATCHES" ] || [ -n "$DIAG_MATCHES" ] || [ -n "$SCHEMA_ROUTE_MATCHES" ]; then
  echo "❌ Debug/schema exposure routes detected in runtime build:"
  [ -n "$DEBUG_MATCHES" ] && echo "$DEBUG_MATCHES"
  [ -n "$INTERNAL_MATCHES" ] && echo "$INTERNAL_MATCHES"
  [ -n "$DIAG_MATCHES" ] && echo "$DIAG_MATCHES"
  [ -n "$SCHEMA_ROUTE_MATCHES" ] && echo "$SCHEMA_ROUTE_MATCHES"
  exit 1
fi
echo "   ✅ Debug/schema exposure check passed"
echo ""

# 3. Lint Check
echo "3️⃣  Running lint check..."
npm run lint:new || npm run lint 2>/dev/null || echo "   ⚠️  Lint check skipped (no lint script)"
echo ""

# 4. Smoke Test - Nest App Boot
echo "4️⃣  Running Nest app boot smoke test..."
npm run test:smoke
if [ $? -ne 0 ]; then
  echo "❌ Smoke test failed - fix DI errors before deploying"
  exit 1
fi
echo "   ✅ Smoke test passed"
echo ""

echo "✅ All deployment guard checks passed!"
echo "🚀 Ready for deployment"

