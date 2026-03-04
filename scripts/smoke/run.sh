#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/smoke/run.sh guard
  scripts/smoke/run.sh staging-onboarding
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
  staging-onboarding)
    bash scripts/smoke/staging-onboarding.sh
    ;;
  *)
    usage
    exit 1
    ;;
esac
