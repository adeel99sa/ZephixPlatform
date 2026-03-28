#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CANONICAL_ENV="${ROOT_DIR}/docs/ai/environments/staging.env"
FRONTEND_ENV="${ROOT_DIR}/zephix-frontend/.env.staging"

if [[ ! -f "${CANONICAL_ENV}" ]]; then
  echo "Missing canonical env file: ${CANONICAL_ENV}"
  exit 1
fi

STAGING_BACKEND_API="$(rg '^STAGING_BACKEND_API=' "${CANONICAL_ENV}" -N | head -n 1 | sed 's/^STAGING_BACKEND_API=//')"
if [[ -z "${STAGING_BACKEND_API}" ]]; then
  echo "STAGING_BACKEND_API missing in ${CANONICAL_ENV}"
  exit 1
fi

if [[ ! -f "${FRONTEND_ENV}" ]]; then
  echo "Missing frontend staging env file: ${FRONTEND_ENV}"
  exit 1
fi

if rg -q '^VITE_API_URL=' "${FRONTEND_ENV}"; then
  tmp_file="$(mktemp)"
  awk -v api="VITE_API_URL=${STAGING_BACKEND_API}" '
    BEGIN { replaced=0 }
    /^VITE_API_URL=/ && replaced==0 { print api; replaced=1; next }
    { print }
    END {
      if (replaced==0) {
        print api
      }
    }
  ' "${FRONTEND_ENV}" > "${tmp_file}"
  mv "${tmp_file}" "${FRONTEND_ENV}"
else
  printf "\nVITE_API_URL=%s\n" "${STAGING_BACKEND_API}" >> "${FRONTEND_ENV}"
fi

echo "Synced VITE_API_URL from ${CANONICAL_ENV} to ${FRONTEND_ENV}"
