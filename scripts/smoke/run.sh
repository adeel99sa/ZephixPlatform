#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/smoke/run.sh deploy-staging
  scripts/smoke/run.sh guard
  scripts/smoke/run.sh contract
  scripts/smoke/run.sh contract-platform-core
  scripts/smoke/run.sh contract-programs-portfolios
  scripts/smoke/run.sh contract-programs-portfolios-linkage
  scripts/smoke/run.sh staging-onboarding
  scripts/smoke/run.sh platform-core
  scripts/smoke/run.sh programs-portfolios
  scripts/smoke/run.sh programs-portfolios-linkage
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

case "$1" in
  deploy-staging)
    bash scripts/deploy-staging.sh
    ;;
  guard)
    bash scripts/guard/no-stale-staging-domains.sh
    bash scripts/guard/no-dead-home-files.sh
    ;;
  contract)
    bash scripts/guard/api-contract-onboarding.sh
    ;;
  contract-platform-core)
    bash scripts/guard/api-contract-platform-core.sh
    ;;
  contract-programs-portfolios)
    bash scripts/guard/api-contract-programs-portfolios.sh
    ;;
  contract-programs-portfolios-linkage)
    bash scripts/guard/api-contract-programs-portfolios-linkage.sh
    ;;
  staging-onboarding)
    bash scripts/smoke/staging-onboarding.sh
    ;;
  platform-core)
    bash scripts/smoke/staging-platform-core.sh
    ;;
  programs-portfolios)
    bash scripts/smoke/staging-programs-portfolios.sh
    ;;
  programs-portfolios-linkage)
    bash scripts/smoke/staging-programs-portfolios-linkage.sh
    ;;
  *)
    usage
    exit 1
    ;;
esac
