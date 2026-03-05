#!/usr/bin/env bash
# deploy-staging.sh
#
# Deploy zephix-backend-staging with enforced COMMIT_SHA injection.
#
# Usage:
#   bash scripts/deploy-staging.sh
#
# COMMIT_SHA is injected explicitly so /api/version always returns
# commitShaTrusted=true. Do not use `railway up` directly without this prefix.

set -euo pipefail

COMMIT_SHA=$(git rev-parse HEAD)
export COMMIT_SHA

echo "Deploying to staging"
echo "COMMIT_SHA: $COMMIT_SHA"
echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
echo ""

railway up

echo ""
echo "Deploy submitted. Verify traceability with:"
echo "  curl -sS \"\$(grep STAGING_BACKEND_BASE docs/ai/environments/staging.env | cut -d= -f2)/api/version\" | jq ."
