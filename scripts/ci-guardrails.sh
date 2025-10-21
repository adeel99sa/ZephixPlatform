#!/usr/bin/env bash
set -euo pipefail
# 1) Disallow hardcoded http(s) backend URLs in frontend runtime files
! git diff --cached -U0 -- 'zephix-frontend/src/**' \
  | grep -E 'https?://[^"]+/api' \
  && echo "OK: no hardcoded API urls" || (echo "BLOCK: hardcoded API URL" && exit 1)

# 2) Prevent deletes of complex modules
! git diff --cached --name-status | grep -E '^D\s+zephix-frontend/src/(features|components|pages)/' \
  || (echo "BLOCK: deleting feature/page files" && exit 1)
