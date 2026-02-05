#!/bin/bash
# release-smoke.sh - Fast release smoke test that fails hard
# Run from repo root: bash scripts/release-smoke.sh
# Requires: both frontend and backend to build successfully

set -euo pipefail

echo "=== Release Smoke Test ==="
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

FAILED=0

# Step 1: Frontend checks
echo "--- Frontend Checks ---"

echo -n "1. Frontend typecheck ... "
cd zephix-frontend
if npm run typecheck --silent 2>/dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  ((FAILED++))
fi

echo -n "2. Frontend build ... "
if npm run build --silent 2>/dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  ((FAILED++))
fi

echo -n "3. Frontend lint:new ... "
LINT_OUTPUT=$(npm run lint:new 2>&1 || true)
# Extract error count from "X problems (Y errors, Z warnings)" line
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -oE '\([0-9]+ errors' | grep -oE '[0-9]+' || echo "0")
if [ -z "$LINT_ERRORS" ] || [ "$LINT_ERRORS" = "0" ]; then
  echo "✅ PASS (0 errors)"
else
  echo "❌ FAIL ($LINT_ERRORS errors)"
  ((FAILED++))
fi

cd ..

# Step 2: Backend checks
echo ""
echo "--- Backend Checks ---"

echo -n "4. Backend build ... "
cd zephix-backend
if npm run build --silent 2>/dev/null; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  ((FAILED++))
fi

echo -n "5. Backend dist/main.js exists ... "
if [ -f "dist/main.js" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  ((FAILED++))
fi

echo -n "6. Backend dist/migrations exists ... "
if [ -d "dist/migrations" ] && [ "$(ls -A dist/migrations 2>/dev/null)" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  ((FAILED++))
fi

cd ..

# Summary
echo ""
echo "=== Summary ==="
if [ "$FAILED" -gt 0 ]; then
  echo "❌ Release smoke FAILED ($FAILED checks failed)"
  echo ""
  echo "Do NOT tag this commit for release."
  exit 1
fi

echo "✅ Release smoke PASSED"
echo ""
echo "Safe to tag for release."
echo "Suggested tag: v0.5.1-rc.$(git rev-parse --short HEAD)"
exit 0
