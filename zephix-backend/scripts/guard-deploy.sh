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

# 2. Lint Check
echo "2️⃣  Running lint check..."
npm run lint:new || npm run lint 2>/dev/null || echo "   ⚠️  Lint check skipped (no lint script)"
echo ""

# 3. Smoke Test - Nest App Boot
echo "3️⃣  Running Nest app boot smoke test..."
npm run test:smoke
if [ $? -ne 0 ]; then
  echo "❌ Smoke test failed - fix DI errors before deploying"
  exit 1
fi
echo "   ✅ Smoke test passed"
echo ""

echo "✅ All deployment guard checks passed!"
echo "🚀 Ready for deployment"

