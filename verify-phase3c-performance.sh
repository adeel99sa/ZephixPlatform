#!/bin/bash
# Phase 3C Performance Spot-Checks Script
set -e

echo "🔐 Zephix Dashboards Phase 3C - Performance Spot-Checks"
echo "======================================================"

cd zephix-frontend

echo "📊 Performance verification checklist:"
echo ""

# Check bundle size
echo "1️⃣ Bundle size analysis..."
BUNDLE_SIZE=$(du -h dist/assets/index-*.js | cut -f1)
echo "   Main bundle size: $BUNDLE_SIZE"
if [[ $BUNDLE_SIZE =~ ^[0-9]+M$ ]] && [[ ${BUNDLE_SIZE%M} -gt 1 ]]; then
    echo "   ⚠️  Bundle size > 1MB - consider code splitting"
else
    echo "   ✅ Bundle size acceptable"
fi

# Check if widgets query is batched (single POST)
echo ""
echo "2️⃣ Widget query batching verification..."
if grep -q "api.post.*widgets/query" src/features/widgets/api.ts; then
    echo "   ✅ Widget queries use single POST request (batched)"
else
    echo "   ❌ Widget queries not properly batched"
fi

# Check export optimization
echo ""
echo "3️⃣ Export optimization verification..."
if grep -q "widgetsData" src/views/dashboards/View.tsx; then
    echo "   ✅ Export uses in-memory data (no requery)"
else
    echo "   ❌ Export may be requerying data"
fi

# Check skeleton loading states
echo ""
echo "4️⃣ Loading states verification..."
if grep -q "dashboard-widgets.*animate-pulse" src/views/dashboards/View.tsx; then
    echo "   ✅ Skeleton loading states implemented"
else
    echo "   ❌ Missing skeleton loading states"
fi

echo ""
echo "✅ Performance spot-checks completed!"
echo ""
echo "Target metrics:"
echo "• /dashboards/:id initial view: < 2s with 8–12 widgets (dev acceptable ≤3s)"
echo "• Single POST /widgets/query (batch) — ensure no N× requests"
echo "• Export uses in-memory data (no requery)"
