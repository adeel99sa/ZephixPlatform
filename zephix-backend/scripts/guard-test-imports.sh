#!/bin/bash

# Test Import Style Guard
# Ensures all e2e tests use standard ES6 import for supertest
# Usage: npm run guard:test-imports

set -e

echo "🔍 Checking test import style..."

# Check for old namespace import style
OLD_IMPORTS=$(grep -r "import request = require('supertest')" test/ --include="*.ts" || true)

if [ -n "$OLD_IMPORTS" ]; then
  echo "❌ Found old supertest import style. Use: import request from 'supertest';"
  echo ""
  echo "Files with old imports:"
  echo "$OLD_IMPORTS"
  exit 1
fi

echo "✅ All test files use standard ES6 import for supertest"
