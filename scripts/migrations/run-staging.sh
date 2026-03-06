#!/usr/bin/env bash
# scripts/migrations/run-staging.sh
#
# Run pending TypeORM migrations against the staging database.
#
# This script MUST be run before 'railway up' in deploy-staging.sh.
# Never rely on auto-migrate-on-boot in staging or production.
#
# Usage:
#   bash scripts/migrations/run-staging.sh
#
# Prerequisites:
#   - DATABASE_URL must be set (Railway staging database URL)
#   - Alternatively, pass it as DATABASE_URL=... bash scripts/migrations/run-staging.sh
#   - Run from the repo root or zephix-backend directory
#   - Backend must be buildable (npm run build completes)
#
# Exit codes:
#   0 — migrations applied successfully (or none pending)
#   1 — failed: missing DATABASE_URL, build failure, or migration error

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
BACKEND_DIR="$REPO_ROOT/zephix-backend"
PROOF_DIR="$REPO_ROOT/docs/architecture/proofs/staging"
PROOF_FILE="$PROOF_DIR/migrations-last-run.txt"
DATE_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)

# ─── GUARD: Must be staging ─────────────────────────────────────────────────
# Prevent accidentally running against production.
# The caller must explicitly set ZEPHIX_ENV=staging.
if [ "${ZEPHIX_ENV:-}" != "staging" ]; then
  echo "FAIL: ZEPHIX_ENV is not 'staging'. This script only runs against staging."
  echo "  Set ZEPHIX_ENV=staging to confirm you are targeting the staging database."
  exit 1
fi

# ─── REQUIRE DATABASE_URL ────────────────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "FAIL: DATABASE_URL is not set."
  echo "  Fetch it from Railway: railway variables get DATABASE_URL --service zephix-backend-staging --environment staging"
  echo "  Then export it: export DATABASE_URL=<value>"
  exit 1
fi

# Redact for log output — never print the full URL
DB_HOST=$(node -e "try{const u=new URL(process.env.DATABASE_URL);console.log(u.hostname)}catch(e){console.log('(parse error)')}" 2>/dev/null || echo '(unknown)')
DB_NAME=$(node -e "try{const u=new URL(process.env.DATABASE_URL);console.log(u.pathname.replace(/^\//,''))}catch(e){console.log('(parse error)')}" 2>/dev/null || echo '(unknown)')

echo "=== Staging Migration Run ==="
echo "date_utc:    $DATE_UTC"
echo "commit_sha:  $COMMIT_SHA"
echo "db_host:     $DB_HOST"
echo "db_name:     $DB_NAME"
echo ""

# ─── BUILD BACKEND ───────────────────────────────────────────────────────────
echo "=== Building backend ==="
cd "$BACKEND_DIR"
npm run build
echo "PASS: Build complete"
echo ""

# ─── SHOW PENDING MIGRATIONS (before) ────────────────────────────────────────
echo "=== Pending migrations (before) ==="
# Capture the show output; non-zero exit means no migrations table yet (first deploy)
SHOW_BEFORE=$(npm run migration:show --silent 2>&1 || true)
echo "$SHOW_BEFORE"
echo ""

# ─── RUN MIGRATIONS ──────────────────────────────────────────────────────────
echo "=== Running migrations ==="
MIGRATION_OUTPUT=$(npm run migration:run 2>&1)
MIGRATION_EXIT=$?
echo "$MIGRATION_OUTPUT"
echo ""

if [ "$MIGRATION_EXIT" -ne 0 ]; then
  echo "FAIL: migration:run exited with code $MIGRATION_EXIT"
  exit 1
fi

echo "PASS: Migrations applied"
echo ""

# ─── SHOW APPLIED MIGRATIONS (after) ─────────────────────────────────────────
echo "=== Applied migrations (after) ==="
SHOW_AFTER=$(npm run migration:show --silent 2>&1 || true)
echo "$SHOW_AFTER"
echo ""

# ─── WRITE PROOF ARTIFACT ────────────────────────────────────────────────────
echo "=== Writing proof artifact ==="
mkdir -p "$PROOF_DIR"

# Extract migration names from output (lines starting with [X] indicate applied)
APPLIED_MIGRATIONS=$(echo "$MIGRATION_OUTPUT" | grep -E '^\[X\]' | sed 's/^\[X\] //' || echo "(none detected in output)")

cat > "$PROOF_FILE" <<EOF
# Staging migration proof — written by scripts/migrations/run-staging.sh
date_utc:    $DATE_UTC
commit_sha:  $COMMIT_SHA
zephix_env:  $ZEPHIX_ENV
db_host:     $DB_HOST
db_name:     $DB_NAME

applied_in_this_run:
$(echo "$APPLIED_MIGRATIONS" | sed 's/^/  /')

migration_show_after:
$(echo "$SHOW_AFTER" | head -50 | sed 's/^/  /')
EOF

echo "Written: $PROOF_FILE"
echo ""
echo "=== Migration run complete ==="
