#!/usr/bin/env bash
# Mobile form-factor Lighthouse accessibility runs against a local preview.
# Usage: from zephix-frontend/, after `npm run build`:
#   ./scripts/rbac-b1-lighthouse-a11y-mobile.sh
# Expects preview at http://127.0.0.1:4173 (start: npx vite preview --host 127.0.0.1 --port 4173)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT_DIR="$ROOT/reports/rbac-b1"
mkdir -p "$OUT_DIR"

BASE="${LIGHTHOUSE_BASE_URL:-http://127.0.0.1:4173}"

paths=(
  "/forgot-password"
  "/reset-password?token=demo"
  "/invites/accept?token=demo"
  "/403?reason=need_org_admin"
  "/403?reason=need_workspace_owner"
  "/login"
  "/login/mfa-challenge"
  "/administration/people"
  "/workspaces/ws-demo/members"
  "/administration/profile"
)

echo "| Page | Accessibility (mobile) |"
echo "|------|------------------------|"

for p in "${paths[@]}"; do
  safe=$(echo "$p" | sed 's/[^a-zA-Z0-9_-]/_/g')
  json_path="$OUT_DIR/lh-a11y-${safe}.json"
  set +e
  npx --yes lighthouse@12 "${BASE}${p}" \
    --only-categories=accessibility \
    --form-factor=mobile \
    --output=json \
    --output-path="$json_path" \
    --chrome-flags="--headless=new --no-sandbox" \
    --quiet
  rc=$?
  set -e
  if [[ $rc -ne 0 ]] || [[ ! -f "$json_path" ]]; then
    echo "| \`$p\` | **error** (run failed) |"
    continue
  fi
  score=$(node -e "const j=require('$json_path'); const s=j.categories&&j.categories.accessibility&&j.categories.accessibility.score; console.log(s!=null?Math.round(s*100):'n/a')")
  echo "| \`$p\` | **${score}** |"
done
