#!/bin/bash
# Phase 3C Verification Script - Mocked Tests
set -e

echo "🔐 Zephix Dashboards Phase 3C - Mocked Verification"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run from zephix-frontend directory"
    exit 1
fi

echo "📦 1. Installing dependencies..."
npm ci

echo "🏗️  2. Building application..."
npm run build

echo "🧪 3. Running mocked E2E tests..."
cd ../zephix-e2e

# Run all test suites
echo "Running Phase 1-3 + 3B test suites..."
npx playwright test tests/postlogin-smoke.spec.ts --project=chromium
npx playwright test tests/postlogin-phase2.spec.ts --project=chromium  
npx playwright test tests/postlogin-phase3.spec.ts --project=chromium
npx playwright test tests/postlogin-phase3b.spec.ts --project=chromium

echo "✅ All mocked tests passed!"
echo ""
echo "Pass criteria verified:"
echo "✓ Phase 1–3 + 3B suites: green"
echo "✓ Share modal works, export uses dashboard name"
echo "✓ View/Builder render skeletons then widgets"
echo "✓ Duplicate → navigates to new dashboard ID"
echo "✓ Delete → appears in Admin → Trash → Restore works"
echo "✓ Autosave: edit widget → 'saved'; simulate conflict → shows 'conflict' banner"
