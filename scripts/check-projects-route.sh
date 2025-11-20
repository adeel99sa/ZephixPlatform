#!/usr/bin/env bash
set -euo pipefail

# Check that projects API calls include workspaceId parameter
# This guards against accidental unscoped queries

echo "🔍 Checking projects API route usage..."

found_unscoped=false

# Check for api.get('/projects') without query params
if grep -r --line-number -E "api\.get\(['\"]/projects['\"]\)" zephix-frontend/src; then
  echo "❌ Found unscoped projects list without ?workspaceId="
  found_unscoped=true
fi

# Check for api.post('/projects') without workspaceId in body
if grep -r --line-number -E "api\.post\(['\"]/projects['\"]," zephix-frontend/src; then
  echo "⚠️  Found direct projects POST calls - verify they include workspaceId"
fi

if [ "$found_unscoped" = true ]; then
  echo ""
  echo "Fix: Ensure all projects list calls use workspaceId query param:"
  echo "  api.get(\`/projects?workspaceId=\${workspaceId}\`)"
  exit 1
fi

echo "✅ Projects routes appear properly scoped"
exit 0

