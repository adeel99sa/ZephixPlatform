#!/bin/bash

# Frontend Fixes Verification Script
echo "🔍 Verifying Frontend Fixes..."

# 1) Set environment variables for testing
export VITE_API_BASE_URL=http://localhost:3000/api
export VITE_ENABLE_TEMPLATES=false

echo "✅ Environment variables set:"
echo "   VITE_API_BASE_URL=$VITE_API_BASE_URL"
echo "   VITE_ENABLE_TEMPLATES=$VITE_ENABLE_TEMPLATES"

# 2) Check if all new files exist
echo ""
echo "📁 Checking new files..."

files=(
  "src/lib/api.ts"
  "src/app/layout/PageHeader.tsx"
  "src/app/ui/ErrorBanner.tsx"
  "src/app/ui/EmptyState.tsx"
  "src/app/ui/Skeleton.tsx"
  "src/features/projects/useProjects.ts"
  "src/features/templates/flags.ts"
  "ENV.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file (missing)"
  fi
done

# 3) Check if updated files exist
echo ""
echo "📝 Checking updated files..."

updated_files=(
  "src/pages/projects/ProjectsPage.tsx"
  "src/pages/templates/TemplateHubPage.tsx"
  "src/pages/dashboard/DashboardPage.tsx"
  "src/components/dashboard/PortfolioDashboard.tsx"
)

for file in "${updated_files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file (missing)"
  fi
done

# 4) Check for TypeScript compilation
echo ""
echo "🔧 Checking TypeScript compilation..."
if npm run type-check > /dev/null 2>&1; then
  echo "   ✅ TypeScript compilation successful"
else
  echo "   ❌ TypeScript compilation failed"
  echo "   Run 'npm run type-check' for details"
fi

# 5) Check for linting
echo ""
echo "🧹 Checking ESLint..."
if npm run lint > /dev/null 2>&1; then
  echo "   ✅ ESLint passed"
else
  echo "   ⚠️  ESLint warnings/errors found"
  echo "   Run 'npm run lint' for details"
fi

echo ""
echo "🎯 Manual Testing Checklist:"
echo "   1. Start dev server: npm run dev"
echo "   2. Navigate to /projects - should show skeleton, then empty state or error banner"
echo "   3. Navigate to /templates - should show disabled message"
echo "   4. Navigate to /dashboard - should show empty state for portfolio data"
echo "   5. Set VITE_ENABLE_TEMPLATES=true and restart to test templates flag"

echo ""
echo "🚀 Frontend fixes verification complete!"
