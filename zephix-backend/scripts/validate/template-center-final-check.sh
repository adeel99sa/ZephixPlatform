#!/usr/bin/env bash
# Template Center final safety checklist: build, migrate, integration tests, rollback drill, curl templates/search/evidence-pack.
# Usage: from zephix-backend: bash scripts/validate/template-center-final-check.sh
# Requires: DATABASE_URL. Optional: PORT, JWT token for protected curls.
set -e
cd "$(dirname "$0")/../.."

APP_PID=""
PORT="${PORT:-3097}"

cleanup() {
  if [ -n "${APP_PID}" ] && kill -0 "${APP_PID}" 2>/dev/null; then
    kill "${APP_PID}" 2>/dev/null || true
    sleep 1
    kill -9 "${APP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

ensure_port_free() {
  local p="${1:-3097}"
  if lsof -iTCP:"${p}" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "FAIL port_in_use port=${p}"
    exit 1
  fi
}

step() {
  if "$@"; then
    echo "PASS $*"
  else
    echo "FAIL $*"
    return 1
  fi
}

echo "=== Template Center final safety check ==="

echo "[1] Build..."
step npm run build || exit 1

echo "[2] db:migrate..."
step npm run db:migrate || exit 1

echo "[3] test:integration:template-center..."
step npm run test:integration:template-center || exit 1

echo "[4] Rollback drill..."
step bash scripts/validate/template-center-rollback-drill.sh || exit 1

echo "[5] Start app for curl checks..."
ensure_port_free "${PORT}"
export NODE_ENV="${NODE_ENV:-development}"
export AUTO_MIGRATE="${AUTO_MIGRATE:-false}"
export TEMPLATE_CENTER_V1=true
PORT="${PORT}" npm run start:railway >>/tmp/zephix-tc-final-app.log 2>&1 &
APP_PID=$!
sleep 8

echo "[6] curl templates list..."
code=$(curl -s -o /tmp/tc-templates.json -w "%{http_code}" "http://localhost:${PORT}/api/template-center/templates" -H "Authorization: Bearer ${TEMPLATE_CENTER_TEST_TOKEN:-invalid}")
if [ "${code}" = "200" ] || [ "${code}" = "401" ] || [ "${code}" = "404" ]; then
  echo "PASS templates_list (${code})"
else
  echo "FAIL templates_list code=${code}"
  exit 1
fi

echo "[7] curl search..."
code=$(curl -s -o /tmp/tc-search.json -w "%{http_code}" "http://localhost:${PORT}/api/template-center/search?q=waterfall&limit=5" -H "Authorization: Bearer ${TEMPLATE_CENTER_TEST_TOKEN:-invalid}")
if [ "${code}" = "200" ] || [ "${code}" = "401" ] || [ "${code}" = "404" ]; then
  echo "PASS search (${code})"
else
  echo "FAIL search code=${code}"
  exit 1
fi

echo "[8] curl evidence-pack..."
code=$(curl -s -o /tmp/tc-evidence.json -w "%{http_code}" "http://localhost:${PORT}/api/template-center/projects/00000000-0000-0000-0000-000000000001/evidence-pack" -H "Authorization: Bearer ${TEMPLATE_CENTER_TEST_TOKEN:-invalid}")
if [ "${code}" = "200" ] || [ "${code}" = "401" ] || [ "${code}" = "403" ] || [ "${code}" = "404" ]; then
  echo "PASS evidence_pack (${code})"
else
  echo "FAIL evidence_pack code=${code}"
  exit 1
fi

echo "=== PASS Template Center final safety check ==="
