#!/bin/bash
set -euo pipefail

ENV=${1:-local}
BASE_URL="http://localhost:3000"

if [ "$ENV" = "staging" ]; then
  BASE_URL="https://api-staging.zephix.ai"
fi

if [ "$ENV" = "production" ]; then
  BASE_URL="https://api.zephix.ai"
fi

echo "Environment: $ENV"
echo "API: $BASE_URL"

./proofs/runtime/curl/auth_cookie_flow.sh "$BASE_URL"
./proofs/runtime/curl/governance_preview.sh "$BASE_URL"
./proofs/runtime/curl/governance_apply.sh "$BASE_URL"
./proofs/runtime/curl/templates_instantiate.sh "$BASE_URL"
./proofs/runtime/curl/resources_utilization.sh "$BASE_URL"
./proofs/runtime/curl/security_negative.sh "$BASE_URL"

echo "All MVP proof scripts executed"
