#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PATTERN='zephix-backend-staging\.up\.railway\.app|zephix-backend-v2-staging\.up\.railway\.app|zephix-platform-staging-production\.up\.railway\.app'

ACTIVE_HITS="$(rg -n "${PATTERN}" "${ROOT_DIR}" \
  -g '!docs/archive/**' \
  -g '!docs/architecture/proofs/**' \
  -g '!scripts/guard/no-stale-staging-domains.sh' || true)"

STAGING_PROOF_HITS="$(rg -n "${PATTERN}" "${ROOT_DIR}/docs/architecture/proofs/staging" || true)"

HITS="${ACTIVE_HITS}"
if [[ -n "${STAGING_PROOF_HITS}" ]]; then
  if [[ -n "${HITS}" ]]; then
    HITS="${HITS}"$'\n'"${STAGING_PROOF_HITS}"
  else
    HITS="${STAGING_PROOF_HITS}"
  fi
fi

if [[ -n "${HITS}" ]]; then
  echo "❌ Found stale staging domain references in active paths"
  echo "${HITS}"
  exit 1
fi

echo "✅ No stale staging domains in active paths"
