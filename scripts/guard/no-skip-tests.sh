#!/bin/bash
# Guard: No new .skip test files
# Fail if any *.spec.ts.skip or *.test.ts.skip exists outside docs/archive
# This prevents test debt from accumulating silently.

set -e

echo "🔍 Checking for .skip test files outside docs/archive..."

# Find .skip test files
SKIP_FILES=$(find . -type f \( -name "*.spec.ts.skip" -o -name "*.test.ts.skip" -o -name "*.spec.tsx.skip" -o -name "*.test.tsx.skip" \) \
  ! -path "./node_modules/*" \
  ! -path "./docs/archive/*" \
  ! -path "./.git/*" 2>/dev/null || true)

if [ -n "$SKIP_FILES" ]; then
  echo "❌ Found .skip test files that should be fixed or moved to docs/archive:"
  echo ""
  echo "$SKIP_FILES" | while IFS= read -r file; do
    echo "  - $file"
  done
  echo ""
  echo "To fix:"
  echo "  1. Rename file back to .spec.ts and fix the tests"
  echo "  2. Or move to docs/archive if permanently obsolete"
  echo ""
  echo "See docs/verification/TEST_DEBT_REGISTER.md for tracking."
  exit 1
fi

echo "✅ No .skip test files found outside docs/archive."
exit 0
