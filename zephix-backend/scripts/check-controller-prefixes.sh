#!/bin/bash

# Guard script to prevent duplicate 'api/' prefixes in controller decorators
# This ensures routes use the global prefix consistently

set -e

echo "🔍 Checking for duplicate 'api/' prefixes in controller decorators..."

# Find all TypeScript controller files
CONTROLLER_FILES=$(find src -name "*.controller.ts" -type f | grep -v node_modules | grep -v ".spec.ts" | grep -v ".bak")

VIOLATIONS=0

for file in $CONTROLLER_FILES; do
  # Check for @Controller('api/...') or @Controller("/api/...")
  if grep -E "@Controller\(['\"]/?(api/|api')" "$file" > /dev/null 2>&1; then
    echo "❌ VIOLATION: $file contains 'api/' prefix in @Controller decorator"
    grep -n "@Controller" "$file" | grep -E "(api/|api')" || true
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo ""
  echo "❌ Found $VIOLATIONS controller(s) with duplicate 'api/' prefix"
  echo ""
  echo "💡 Fix: Remove 'api/' from @Controller decorators"
  echo "   Global prefix '/api' is set in main.ts"
  echo "   Controllers should use: @Controller('path') not @Controller('api/path')"
  echo ""
  exit 1
fi

echo "✅ No duplicate 'api/' prefixes found in controllers"
exit 0

