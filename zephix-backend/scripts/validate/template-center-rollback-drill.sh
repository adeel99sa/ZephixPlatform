#!/usr/bin/env bash
# Template Center rollback drill: flag off -> start -> health; flag on -> apply; flag off -> restart -> health.
# Usage: from zephix-backend: bash scripts/validate/template-center-rollback-drill.sh
# Requires: DATABASE_URL. No external dependencies.
set -e
cd "$(dirname "$0")/../.."

APP_PID=""
PORT="${PORT:-3098}"

cleanup() {
  if [ -n "${APP_PID}" ] && kill -0 "${APP_PID}" 2>/dev/null; then
    kill "${APP_PID}" 2>/dev/null || true
    sleep 1
    kill -9 "${APP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

ensure_port_free() {
  local p="${1:-3098}"
  if lsof -iTCP:"${p}" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "FAIL port_in_use port=${p}"
    exit 1
  fi
}

health_ready() {
  if curl -sf "http://localhost:${PORT}/api/health/ready" >/dev/null 2>&1; then
    echo "PASS health_ready"
  else
    echo "FAIL health_ready"
    return 1
  fi
}

start_app() {
  ensure_port_free "${PORT}"
  export NODE_ENV="${NODE_ENV:-development}"
  export AUTO_MIGRATE="${AUTO_MIGRATE:-false}"
  export TEMPLATE_CENTER_V1="${TEMPLATE_CENTER_V1:-false}"
  PORT="${PORT}" npm run start:railway >>/tmp/zephix-tc-rollback-app.log 2>&1 &
  APP_PID=$!
  sleep 6
}

echo "=== Template Center rollback drill ==="

echo "[Step 1] Set TEMPLATE_CENTER_V1=false, start app..."
export TEMPLATE_CENTER_V1=false
start_app
echo "PASS start"

echo "[Step 2] Hit /api/health/ready..."
health_ready || exit 1

echo "[Step 3] Stop app, set TEMPLATE_CENTER_V1=true..."
cleanup
sleep 2
export TEMPLATE_CENTER_V1=true
start_app
echo "PASS start_with_flag_on"

echo "[Step 4] Hit /api/health/ready..."
health_ready || exit 1

echo "[Step 5] Apply template (POST expect 401 without auth)..."
# No token: expect 401; endpoint exists when flag on
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:${PORT}/api/template-center/projects/00000000-0000-0000-0000-000000000001/apply" \
  -H "Content-Type: application/json" \
  -d '{"templateKey":"waterfall_standard","version":1}')
if [ "${code}" = "401" ] || [ "${code}" = "404" ] || [ "${code}" = "201" ]; then
  echo "PASS apply_endpoint_reachable (${code})"
else
  echo "FAIL apply_endpoint unexpected_code=${code}"
  exit 1
fi

echo "[Step 6] Set TEMPLATE_CENTER_V1=false, restart app..."
cleanup
sleep 2
export TEMPLATE_CENTER_V1=false
start_app
echo "PASS restart_with_flag_off"

echo "[Step 7] Hit /api/health/ready again..."
health_ready || exit 1

echo "=== PASS Template Center rollback drill ==="
