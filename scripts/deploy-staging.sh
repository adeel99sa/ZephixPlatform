#!/usr/bin/env bash
# deploy-staging.sh
#
# Deploy zephix-backend-staging with enforced COMMIT_SHA injection.
#
# Usage:
#   bash scripts/deploy-staging.sh
#
# Preflight checks:
#   - Must be authenticated with Railway (railway whoami)
#   - Must be on 'main' branch (override with ALLOW_NON_MAIN=true)
#   - Working tree must be clean (no uncommitted changes)
#   - Railway project context must reference zephix-backend-staging
#   - STAGING_BACKEND_BASE domain must include the expected staging hostname
#
# STAGING_BASE is read from docs/ai/environments/staging.env.
# After deploy, polls /api/version until commitSha matches local HEAD.
# Writes proof artifact to docs/architecture/proofs/staging/.
#
# Requires: jq (brew install jq)

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
STAGING_ENV_FILE="$REPO_ROOT/docs/ai/environments/staging.env"
EXPECTED_SERVICE="zephix-backend-staging"
EXPECTED_ENVIRONMENT="staging"
EXPECTED_STAGING_HOST="zephix-backend-staging-staging.up.railway.app"
PROOF_DIR="$REPO_ROOT/docs/architecture/proofs/staging"
POLL_TIMEOUT_SECONDS=180
POLL_INTERVAL_SECONDS=10

# ─── REQUIRE jq ─────────────────────────────────────────────────────────────────
if ! command -v jq >/dev/null 2>&1; then
  echo "FAIL: jq is required but not found. Install with: brew install jq"
  exit 1
fi

# ─── LOAD STAGING BASE FROM staging.env ─────────────────────────────────────────
if [ ! -f "$STAGING_ENV_FILE" ]; then
  echo "FAIL: staging.env not found at $STAGING_ENV_FILE"
  exit 1
fi
STAGING_BASE=$(grep -E '^STAGING_BACKEND_BASE=' "$STAGING_ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
if [ -z "$STAGING_BASE" ]; then
  echo "FAIL: STAGING_BACKEND_BASE not set in $STAGING_ENV_FILE"
  exit 1
fi

# ─── PREFLIGHT: Validate STAGING_BASE domain ────────────────────────────────────
echo "=== Preflight: STAGING_BASE domain validation ==="
if ! echo "$STAGING_BASE" | grep -q "$EXPECTED_STAGING_HOST"; then
  echo "FAIL: STAGING_BASE domain does not match expected staging hostname."
  echo "  Got:      $STAGING_BASE"
  echo "  Expected: must contain '$EXPECTED_STAGING_HOST'"
  echo "  Fix STAGING_BACKEND_BASE in docs/ai/environments/staging.env"
  exit 1
fi
echo "PASS: STAGING_BASE domain confirmed: $STAGING_BASE"
echo ""

# ─── PREFLIGHT: Railway authentication ─────────────────────────────────────────
echo "=== Preflight: Railway auth ==="
RAILWAY_USER=$(railway whoami 2>/dev/null || true)
if [ -z "$RAILWAY_USER" ]; then
  echo "FAIL: Not authenticated with Railway. Run: railway login"
  exit 1
fi
echo "PASS: Authenticated as $RAILWAY_USER"
echo ""

# ─── PREFLIGHT: Branch guard ────────────────────────────────────────────────────
echo "=== Preflight: Branch guard ==="
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
ALLOW_NON_MAIN="${ALLOW_NON_MAIN:-false}"
if [ "$CURRENT_BRANCH" != "main" ] && [ "$ALLOW_NON_MAIN" != "true" ]; then
  echo "FAIL: Must be on 'main' branch to deploy staging. Current: '$CURRENT_BRANCH'"
  echo "  To override: ALLOW_NON_MAIN=true bash scripts/deploy-staging.sh"
  exit 1
fi
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "PASS: Branch is 'main'"
else
  echo "PASS (OVERRIDE): Branch is '$CURRENT_BRANCH' [ALLOW_NON_MAIN=true, main guard bypassed]"
  echo "  WARNING: Deploying from non-main branch. Proof will record branch name."
fi
echo ""

# ─── PREFLIGHT: Dirty-tree guard ────────────────────────────────────────────────
echo "=== Preflight: Working tree clean ==="
if [ -n "$(git status --short)" ]; then
  echo "FAIL: Working tree is dirty. Commit or stash changes before deploying."
  git status --short
  exit 1
fi
echo "PASS: Working tree is clean"
echo ""

# ─── PREFLIGHT: Railway context verification (hard fail) ────────────────────────
echo "=== Preflight: Railway context verification ==="
RAILWAY_STATUS=$(railway status 2>/dev/null || true)
if ! echo "$RAILWAY_STATUS" | grep -qi "$EXPECTED_SERVICE"; then
  echo "FAIL: Railway context does not reference '$EXPECTED_SERVICE'."
  echo "  This means you are linked to a different project or service."
  echo "  railway status output:"
  echo "$RAILWAY_STATUS"
  echo ""
  echo "  Fix: run 'railway link' and select the correct project/service,"
  echo "  or ensure your working directory has a .railway config linking to $EXPECTED_SERVICE."
  exit 1
fi
echo "PASS: Railway context confirms service '$EXPECTED_SERVICE'"
echo ""

# ─── RESOLVE COMMIT SHA ──────────────────────────────────────────────────────────
COMMIT_SHA=$(git rev-parse HEAD)
export COMMIT_SHA

echo "=== Deploy Summary ==="
echo "Branch:      $CURRENT_BRANCH"
echo "Commit SHA:  $COMMIT_SHA"
echo "Service:     $EXPECTED_SERVICE"
echo "Environment: $EXPECTED_ENVIRONMENT"
echo "Target:      $STAGING_BASE"
echo ""

# ─── CAPTURE PRE-DEPLOY VERSION ─────────────────────────────────────────────────
echo "=== Capturing pre-deploy /api/version ==="
PRE_DEPLOY_RESPONSE=$(curl -sS --max-time 10 "$STAGING_BASE/api/version" 2>/dev/null || echo "{}")
PRE_DEPLOY_DEPLOYMENT_ID=$(echo "$PRE_DEPLOY_RESPONSE" | jq -r '.railwayDeploymentId // .data.railwayDeploymentId // "unknown"')
PRE_DEPLOY_COMMIT=$(echo "$PRE_DEPLOY_RESPONSE" | jq -r '.commitSha // .data.commitSha // "unknown"')
echo "Pre-deploy commitSha:           $PRE_DEPLOY_COMMIT"
echo "Pre-deploy railwayDeploymentId: $PRE_DEPLOY_DEPLOYMENT_ID"
echo ""

# ─── SET COMMIT_SHA AS RAILWAY SERVICE VARIABLE ──────────────────────────────────
# COMMIT_SHA must be set as a Railway service variable — not a local shell export.
# Local shell env vars do not propagate to Railway's cloud build environment.
echo "=== Setting COMMIT_SHA Railway variable ==="
railway variables \
  --set "COMMIT_SHA=$COMMIT_SHA" \
  --service "$EXPECTED_SERVICE" \
  --environment "$EXPECTED_ENVIRONMENT" \
  --skip-deploys
echo "PASS: COMMIT_SHA=$COMMIT_SHA set in Railway service '$EXPECTED_SERVICE' env '$EXPECTED_ENVIRONMENT'"
echo ""

# ─── RUN STAGING MIGRATIONS ──────────────────────────────────────────────────────
# Migrations MUST run before deploy so schema is correct before traffic shifts.
# DATABASE_URL is required. Fetch it once and export before calling this script:
#
#   export DATABASE_URL=$(railway variables get DATABASE_URL \
#     --service zephix-backend-staging --environment staging)
#
# Do not echo DATABASE_URL; redirect to variable only.
echo "=== Running staging migrations ==="
if [ -z "${DATABASE_URL:-}" ]; then
  echo "FAIL: DATABASE_URL is not set. Cannot run migrations before deploy."
  echo ""
  echo "  Fetch and export it (no echo, no log):"
  echo "    export DATABASE_URL=\$(railway variables get DATABASE_URL \\"
  echo "      --service zephix-backend-staging --environment staging)"
  echo ""
  echo "  Then re-run: bash scripts/deploy-staging.sh"
  exit 1
fi
ZEPHIX_ENV=staging bash "$REPO_ROOT/scripts/migrations/run-staging.sh"
echo ""

# ─── DEPLOY ──────────────────────────────────────────────────────────────────────
echo "=== Deploying to Railway ==="
railway up \
  --service "$EXPECTED_SERVICE" \
  --environment "$EXPECTED_ENVIRONMENT" \
  --detach
echo ""
echo "Deploy queued. Polling $STAGING_BASE/api/version for commit propagation..."
echo ""

# ─── POLL FOR PROPAGATION ────────────────────────────────────────────────────────
ELAPSED=0
POST_DEPLOY_COMMIT=""
POST_DEPLOY_TRUSTED=""
POST_DEPLOY_DEPLOYMENT_ID=""
POST_DEPLOY_ENV=""

while [ "$ELAPSED" -lt "$POLL_TIMEOUT_SECONDS" ]; do
  sleep "$POLL_INTERVAL_SECONDS"
  ELAPSED=$((ELAPSED + POLL_INTERVAL_SECONDS))

  RESPONSE=$(curl -sS --max-time 10 "$STAGING_BASE/api/version" 2>/dev/null || echo "{}")
  REMOTE_COMMIT=$(echo "$RESPONSE"   | jq -r '.commitSha         // .data.commitSha         // ""')
  REMOTE_TRUSTED=$(echo "$RESPONSE"  | jq -r '.commitShaTrusted  // .data.commitShaTrusted  // false')
  REMOTE_DEPLOY_ID=$(echo "$RESPONSE"| jq -r '.railwayDeploymentId // .data.railwayDeploymentId // ""')
  REMOTE_ENV=$(echo "$RESPONSE"      | jq -r '.zephixEnv         // .data.zephixEnv         // ""')

  echo "  [${ELAPSED}s] commitSha=$REMOTE_COMMIT trusted=$REMOTE_TRUSTED zephixEnv=$REMOTE_ENV deploymentId=$REMOTE_DEPLOY_ID"

  # Env guard: refuse to accept version response from a non-staging service
  if [ -n "$REMOTE_ENV" ] && [ "$REMOTE_ENV" != "staging" ]; then
    echo ""
    echo "FAIL: /api/version returned zephixEnv='$REMOTE_ENV' — expected 'staging'."
    echo "  The Railway service at $STAGING_BASE is not the staging service."
    echo "  Check Railway project linking and STAGING_BACKEND_BASE in staging.env."
    exit 1
  fi

  if [ "$REMOTE_COMMIT" = "$COMMIT_SHA" ] \
    && [ "$REMOTE_TRUSTED" = "true" ] \
    && [ -n "$REMOTE_DEPLOY_ID" ] \
    && [ "$REMOTE_ENV" = "staging" ]; then
    POST_DEPLOY_COMMIT="$REMOTE_COMMIT"
    POST_DEPLOY_TRUSTED="$REMOTE_TRUSTED"
    POST_DEPLOY_DEPLOYMENT_ID="$REMOTE_DEPLOY_ID"
    POST_DEPLOY_ENV="$REMOTE_ENV"
    echo ""
    echo "PASS: Deploy propagated successfully."
    break
  fi
done

if [ "$POST_DEPLOY_COMMIT" != "$COMMIT_SHA" ]; then
  echo ""
  echo "FAIL: Deploy did not propagate within ${POLL_TIMEOUT_SECONDS}s."
  echo "  Expected commitSha: $COMMIT_SHA"
  echo "  Got commitSha:      $POST_DEPLOY_COMMIT"
  echo "  Check Railway dashboard for deployment status."
  exit 1
fi

# ─── WRITE PROOF ARTIFACT ────────────────────────────────────────────────────────
echo ""
echo "=== Writing proof artifact ==="
mkdir -p "$PROOF_DIR"
DATE_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PROOF_FILE="$PROOF_DIR/version-after-deploy.txt"

DEPLOYMENT_ID_CHANGED="false"
if [ "$PRE_DEPLOY_DEPLOYMENT_ID" != "$POST_DEPLOY_DEPLOYMENT_ID" ]; then
  DEPLOYMENT_ID_CHANGED="true"
fi

cat > "$PROOF_FILE" <<EOF
# Deploy proof — written by scripts/deploy-staging.sh
date_utc: $DATE_UTC
branch: $CURRENT_BRANCH
allow_non_main_override: $ALLOW_NON_MAIN
local_head: $COMMIT_SHA

pre_deploy:
  commitSha: $PRE_DEPLOY_COMMIT
  railwayDeploymentId: $PRE_DEPLOY_DEPLOYMENT_ID

post_deploy:
  commitSha: $POST_DEPLOY_COMMIT
  commitShaTrusted: $POST_DEPLOY_TRUSTED
  zephixEnv: $POST_DEPLOY_ENV
  railwayDeploymentId: $POST_DEPLOY_DEPLOYMENT_ID

deployment_id_changed: $DEPLOYMENT_ID_CHANGED
EOF

echo "Written: $PROOF_FILE"
echo ""
echo "=== Deploy Complete ==="
cat "$PROOF_FILE"
