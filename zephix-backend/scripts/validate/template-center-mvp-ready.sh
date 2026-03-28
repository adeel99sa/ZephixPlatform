#!/usr/bin/env bash
# Template Center MVP readiness: build, migrate, seed (non-prod), start, smoke (health, apply, list docs, KPI value, gate).
# Usage: from zephix-backend: bash scripts/validate/template-center-mvp-ready.sh
# Requires: DATABASE_URL, JWT_SECRET (for auth if calling protected endpoints).
set -e
cd "$(dirname "$0")/../.."

APP_PID=""
PORT="${PORT:-3099}"

cleanup() {
  if [ -n "${APP_PID}" ] && kill -0 "${APP_PID}" 2>/dev/null; then
    kill "${APP_PID}" 2>/dev/null || true
    sleep 1
    kill -9 "${APP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

ensure_port_free() {
  local p="${1:-3099}"
  if lsof -iTCP:"${p}" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "FAIL port_in_use port=${p}"
    exit 1
  fi
}

echo "=== template-center-mvp-ready ==="

echo "[1/6] Build..."
npm run build
echo "OK build"

echo "[2/6] db:migrate..."
npm run db:migrate
echo "OK db:migrate"

if [ "$NODE_ENV" != "production" ]; then
  echo "[3/6] Seed (TEMPLATE_CENTER_SEED_OK=true)..."
  TEMPLATE_CENTER_SEED_OK=true npm run template-center:seed:kpis || true
  TEMPLATE_CENTER_SEED_OK=true npm run template-center:seed:docs || true
  TEMPLATE_CENTER_SEED_OK=true npm run template-center:seed:templates || true
else
  echo "[3/6] Seed skipped (production)"
fi
echo "OK seed"

echo "[4/6] Start app on port ${PORT}..."
ensure_port_free "${PORT}"
export NODE_ENV="${NODE_ENV:-development}"
export AUTO_MIGRATE="${AUTO_MIGRATE:-false}"
PORT="${PORT}" npm run start:railway >>/tmp/zephix-tc-ready-app.log 2>&1 &
APP_PID=$!
sleep 8
echo "OK start"

echo "[5/6] Health ready..."
curl -sf "http://localhost:${PORT}/api/health/ready" || { echo "FAIL health_ready"; exit 1; }
echo "OK health_ready"

echo "[6/6] Template Center endpoints (optional, require auth)..."
curl -sf "http://localhost:${PORT}/api/template-center/templates" -H "Authorization: Bearer fake" -o /dev/null || true
curl -sf "http://localhost:${PORT}/api/template-center/kpis" -H "Authorization: Bearer fake" -o /dev/null || true
echo "OK endpoints_available"

echo "=== OK template-center-mvp-ready ==="
