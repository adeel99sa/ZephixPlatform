#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/smoke/run.sh deploy-staging
  scripts/smoke/run.sh guard
  scripts/smoke/run.sh guard-no-import-drift
  scripts/smoke/run.sh guard-no-role-drift
  scripts/smoke/run.sh guard-smoke-proof-trust <proof-dir>
  scripts/smoke/run.sh contract                   # run ALL contract guards
  scripts/smoke/run.sh contract-all               # alias for contract
  scripts/smoke/run.sh contract-onboarding
  scripts/smoke/run.sh contract-platform-core
  scripts/smoke/run.sh preflight-platform-core
  scripts/smoke/run.sh contract-programs-portfolios
  scripts/smoke/run.sh contract-programs-portfolios-linkage
  scripts/smoke/run.sh contract-org-invites
  scripts/smoke/run.sh contract-customer-journey
  scripts/smoke/run.sh staging-onboarding
  scripts/smoke/run.sh platform-core
  scripts/smoke/run.sh programs-portfolios
  scripts/smoke/run.sh programs-portfolios-linkage
  scripts/smoke/run.sh org-invites
  scripts/smoke/run.sh customer-journey
  scripts/smoke/run.sh ui-acceptance
  scripts/smoke/run.sh guard-ui-acceptance
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

_run_all_contracts() {
  bash scripts/guard/api-contract-onboarding.sh
  bash scripts/guard/api-contract-platform-core.sh
  bash scripts/guard/api-contract-programs-portfolios.sh
  bash scripts/guard/api-contract-programs-portfolios-linkage.sh
  bash scripts/guard/api-contract-org-invites.sh
  bash scripts/guard/api-contract-customer-journey.sh
}

case "$1" in
  deploy-staging)
    bash scripts/deploy-staging.sh
    ;;
  guard)
    bash scripts/guard/no-stale-staging-domains.sh
    bash scripts/guard/no-dead-home-files.sh
    bash scripts/guard/contract-runner-parity.sh
    bash scripts/guard/no-token-in-proof-artifacts.sh
    bash scripts/guard/no-import-drift.sh
    bash scripts/guard/no-role-drift.sh
    ;;
  guard-no-import-drift)
    bash scripts/guard/no-import-drift.sh
    ;;
  guard-no-role-drift)
    bash scripts/guard/no-role-drift.sh
    ;;
  guard-smoke-proof-trust)
    if [[ $# -ne 2 ]]; then
      echo "Usage: scripts/smoke/run.sh guard-smoke-proof-trust <proof-dir>"
      exit 1
    fi
    bash scripts/guard/smoke-proof-deployment-trust.sh "$2"
    ;;
  contract|contract-all)
    _run_all_contracts
    ;;
  contract-onboarding)
    bash scripts/guard/api-contract-onboarding.sh
    ;;
  contract-platform-core)
    bash scripts/guard/api-contract-platform-core.sh
    ;;
  preflight-platform-core)
    bash scripts/guard/api-preflight-platform-core.sh
    ;;
  contract-programs-portfolios)
    bash scripts/guard/api-contract-programs-portfolios.sh
    ;;
  contract-programs-portfolios-linkage)
    bash scripts/guard/api-contract-programs-portfolios-linkage.sh
    ;;
  contract-org-invites)
    bash scripts/guard/api-contract-org-invites.sh
    ;;
  contract-customer-journey)
    bash scripts/guard/api-contract-customer-journey.sh
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
  org-invites)
    bash scripts/smoke/staging-org-invites.sh
    ;;
  customer-journey)
    bash scripts/smoke/staging-customer-journey.sh
    ;;
  ui-acceptance)
    bash scripts/smoke/staging-ui-acceptance.sh
    ;;
  guard-ui-acceptance)
    bash scripts/guard/ui-acceptance-guard.sh
    ;;
  *)
    usage
    exit 1
    ;;
esac
