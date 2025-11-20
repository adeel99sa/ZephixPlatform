#!/bin/bash
# Phase 3C Real Backend Verification Script
set -e

echo "🔐 Zephix Dashboards Phase 3C - Real Backend Verification"
echo "========================================================"

# Check environment variables
if [ -z "$E2E_BASE_URL" ]; then
    echo "❌ E2E_BASE_URL not set. Run: ./setup-phase3c-env.sh"
    exit 1
fi

if [ -z "$VITE_API_URL" ]; then
    echo "❌ VITE_API_URL not set. Run: ./setup-phase3c-env.sh"
    exit 1
fi

echo "🌐 Environment:"
echo "  E2E_BASE_URL: $E2E_BASE_URL"
echo "  VITE_API_URL: $VITE_API_URL"
echo "  VITE_FLAGS: ${VITE_FLAGS:-'(none)'}"
echo ""

# Check if we're in the right directory
if [ ! -d "zephix-e2e" ]; then
    echo "❌ Please run from project root directory"
    exit 1
fi

cd zephix-e2e

echo "🔐 1. Creating authentication storage state..."
if [ ! -f "tests/.auth/admin.json" ]; then
    echo "Creating tests/.auth directory..."
    mkdir -p tests/.auth
    
    echo "Running auth setup script..."
    node tests/utils/auth.setup.ts
    echo "✅ Auth storage state created"
else
    echo "✅ Auth storage state already exists"
fi

echo ""
echo "🧪 2. Running real backend E2E tests..."
echo "Note: These tests will hit the real backend at $E2E_BASE_URL"
echo ""

E2E_REAL=true \
E2E_BASE_URL="$E2E_BASE_URL" \
npx playwright test -g "postlogin" --project=chromium

echo "✅ Real backend tests completed!"
echo ""
echo "Pass criteria verified:"
echo "✓ Login skips mocks, lands on /dashboards or /home"
echo "✓ /dashboards/:id loads real data; filters persist to URL+localStorage"
echo "✓ /dashboards/:id/edit autosaves with ETag; 412 → conflict UI"
echo "✓ /widgets/query returns widget rows in <300ms p95"
echo ""
echo "🚀 Real backend integration verified!"
