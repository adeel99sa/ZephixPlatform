#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PATTERN='zephix-backend-staging\.up\.railway\.app|zephix-backend-v2-staging\.up\.railway\.app|zephix-platform-staging-production\.up\.railway\.app'

HITS="$(rg -n "${PATTERN}" "${ROOT_DIR}" \
  -g '!docs/architecture/proofs/staging/**' \
  -g '!scripts/guard/no-stale-staging-domains.sh' || true)"

if [[ -n "${HITS}" ]]; then
  echo "❌ Found stale staging domain references outside docs/architecture/proofs/staging/"
  echo "${HITS}"
  exit 1
fi

echo "✅ No stale staging domains outside docs/architecture/proofs/staging/"
