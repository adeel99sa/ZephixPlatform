#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/smoke/run.sh guard
  scripts/smoke/run.sh contract
  scripts/smoke/run.sh contract-platform-core
  scripts/smoke/run.sh staging-onboarding
  scripts/smoke/run.sh platform-core
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

case "$1" in
  guard)
    bash scripts/guard/no-stale-staging-domains.sh
    ;;
  contract)
    bash scripts/guard/api-contract-onboarding.sh
    ;;
  contract-platform-core)
    bash scripts/guard/api-contract-platform-core.sh
    ;;
  staging-onboarding)
    bash scripts/smoke/staging-onboarding.sh
    ;;
  platform-core)
    bash scripts/smoke/staging-platform-core.sh
    ;;
  *)
    usage
    exit 1
    ;;
esac
