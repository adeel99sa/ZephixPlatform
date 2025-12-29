#!/bin/bash

# Check for mutual module imports without forwardRef
# This prevents circular dependency issues in NestJS DI

set -e

MODULES_DIR=""
if [ -d "zephix-backend/src/modules" ]; then
  MODULES_DIR="zephix-backend/src/modules"
elif [ -d "src/modules" ]; then
  MODULES_DIR="src/modules"
else
  echo "❌ Error: Cannot find src/modules directory"
  exit 1
fi

echo "🔍 Checking for mutual module imports without forwardRef..."

VIOLATIONS=0

# Find all module.ts files
find "$MODULES_DIR" -name "*.module.ts" -type f | while read -r module_file; do
  module_name=$(basename "$module_file" .module.ts)
  module_dir=$(dirname "$module_file")

  # Extract imports from this module
  imports=$(grep -E "import.*from.*\.module" "$module_file" | grep -v "forwardRef" | sed 's/.*from.*\([^/]*\)\.module.*/\1/' || true)

  if [ -z "$imports" ]; then
    continue
  fi

  # Check each imported module to see if it imports back
  for imported_module in $imports; do
    # Find the imported module file
    imported_file=$(find "$MODULES_DIR" -name "${imported_module}.module.ts" -type f | head -1)

    if [ -z "$imported_file" ]; then
      continue
    fi

    # Check if imported module imports back without forwardRef
    if grep -q "import.*from.*${module_name}\.module" "$imported_file" && ! grep -q "forwardRef.*${module_name}" "$imported_file"; then
      echo "❌ Mutual import without forwardRef detected:"
      echo "   $module_file imports ${imported_module}.module"
      echo "   $imported_file imports ${module_name}.module (without forwardRef)"
      echo ""
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
done

if [ $VIOLATIONS -gt 0 ]; then
  echo "❌ Found $VIOLATIONS mutual import violation(s)"
  echo ""
  echo "Fix: Add forwardRef() to one or both sides:"
  echo "  import { forwardRef } from '@nestjs/common';"
  echo "  imports: [forwardRef(() => OtherModule)]"
  exit 1
fi

echo "✅ No mutual imports without forwardRef found"
exit 0


