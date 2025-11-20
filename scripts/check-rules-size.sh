#!/usr/bin/env bash
set -euo pipefail

# Guard the rules - ensure no rule file exceeds 500 lines
# Prevents bloat and keeps modular rules readable

max=500
fail=0

echo "📏 Checking rule file sizes..."

for f in rules/*.mdc; do
  if [ ! -f "$f" ]; then
    continue
  fi

  lines=$(wc -l < "$f")
  if [ "$lines" -gt "$max" ]; then
    echo "❌ $f has $lines lines (> $max)"
    echo "   Split into smaller, focused rule files"
    fail=1
  else
    echo "  ✓ $f: $lines lines"
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "✅ All rule files under $max lines"
  exit 0
else
  exit 1
fi

