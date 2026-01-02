#!/bin/bash
# Phase 2 Verification Runner
# Usage: TOKEN="your-token" bash scripts/run-phase2-verification.sh

set -euo pipefail

BASE="https://zephix-backend-production.up.railway.app"

if [ -z "${TOKEN:-}" ]; then
  echo "❌ ERROR: TOKEN environment variable is required"
  echo "Usage: TOKEN=\"your-token\" bash scripts/run-phase2-verification.sh"
  exit 1
fi

echo "🚀 Phase 2 Verification - Getting IDs and Running Script"
echo "========================================================="
echo ""

# Preflight: Check /api/version commitShaTrusted
echo "📋 Preflight: Checking /api/version commitShaTrusted..."
VERSION_CHECK=$(curl -s "$BASE/api/version")
COMMIT_SHA_TRUSTED=$(echo "$VERSION_CHECK" | jq -r '.data.commitShaTrusted // false')
if [ "$COMMIT_SHA_TRUSTED" != "true" ]; then
  COMMIT_SHA=$(echo "$VERSION_CHECK" | jq -r '.data.commitSha // "unknown"')
  if [ "$COMMIT_SHA" = "unknown" ] && [ "$COMMIT_SHA_TRUSTED" = "false" ]; then
    echo "❌ ERROR: commitSha is 'unknown' and untrusted in production"
    echo "   Railway must set RAILWAY_GIT_COMMIT_SHA for deployment verification."
    exit 1
  fi
  echo "⚠️  WARNING: commitShaTrusted is false (commit SHA may not reflect actual deployment)"
fi
echo "✅ Preflight check passed"
echo ""

# Get IDs
echo "📋 Step 1: Getting Organization ID..."
export ORG_ID=$(curl -s "$BASE/api/organizations" -H "Authorization: Bearer $TOKEN" | jq -r ".data[0].id")
if [ "$ORG_ID" = "null" ] || [ -z "$ORG_ID" ]; then
  echo "❌ ERROR: Failed to get ORG_ID"
  curl -s "$BASE/api/organizations" -H "Authorization: Bearer $TOKEN" | jq .
  exit 1
fi
echo "✅ ORG_ID: $ORG_ID"

echo ""
echo "📋 Step 2: Getting Workspace ID..."
export WORKSPACE_ID=$(curl -s "$BASE/api/workspaces" -H "Authorization: Bearer $TOKEN" | jq -r ".data[0].id")
if [ "$WORKSPACE_ID" = "null" ] || [ -z "$WORKSPACE_ID" ]; then
  echo "❌ ERROR: Failed to get WORKSPACE_ID"
  curl -s "$BASE/api/workspaces" -H "Authorization: Bearer $TOKEN" | jq .
  exit 1
fi
echo "✅ WORKSPACE_ID: $WORKSPACE_ID"

echo ""
echo "📋 Step 3: Getting Project ID..."
export PROJECT_ID=$(curl -s "$BASE/api/projects" -H "Authorization: Bearer $TOKEN" -H "x-workspace-id: $WORKSPACE_ID" | jq -r ".data.projects[0].id")
if [ "$PROJECT_ID" = "null" ] || [ -z "$PROJECT_ID" ]; then
  echo "❌ ERROR: Failed to get PROJECT_ID"
  curl -s "$BASE/api/projects" -H "Authorization: Bearer $TOKEN" -H "x-workspace-id: $WORKSPACE_ID" | jq .
  exit 1
fi
echo "✅ PROJECT_ID: $PROJECT_ID"

echo ""
echo "📋 Step 4: Setting environment variables..."
export BASE="$BASE"
echo "✅ All variables set:"
echo "   BASE: $BASE"
echo "   TOKEN: ${TOKEN:0:20}..."
echo "   ORG_ID: $ORG_ID"
echo "   WORKSPACE_ID: $WORKSPACE_ID"
echo "   PROJECT_ID: $PROJECT_ID"

echo ""
echo "🚀 Step 5: Running verification script..."
echo "========================================================="
echo ""

bash ./scripts/phase2-deploy-verify.sh

