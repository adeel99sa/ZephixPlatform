#!/usr/bin/env bash
# no-token-in-proof-artifacts.sh
#
# Guard: scan proof directories for unredacted invite tokens.
# Fails if:
#   1. Any file is named *.raw.json (raw token responses must never be persisted)
#   2. Any file named *invite-token* contains a "token" JSON key with a
#      non-redacted value (i.e., not "[REDACTED]")
#
# CSRF token files are intentionally excluded from rule 2 — CSRF tokens are
# session-scoped ephemeral values, not invite secrets.
#
# Usage:
#   bash scripts/guard/no-token-in-proof-artifacts.sh [<proof-dir> ...]
#
# Default proof dirs scanned:
#   docs/architecture/proofs/staging/

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PROOF_DIRS=("$@")
if [[ ${#PROOF_DIRS[@]} -eq 0 ]]; then
  PROOF_DIRS=("${ROOT_DIR}/docs/architecture/proofs/staging")
fi

FAIL=0

echo "=== Token Artifact Guard ==="
for dir in "${PROOF_DIRS[@]}"; do
  if [[ ! -d "${dir}" ]]; then
    echo "SKIP: ${dir} (directory does not exist)"
    continue
  fi
  echo "Scanning: ${dir}"

  # Rule 1: no *.raw.json files anywhere in proof dirs
  while IFS= read -r -d '' f; do
    echo "FAIL: raw token artifact found: ${f}"
    FAIL=1
  done < <(find "${dir}" -type f -name "*.raw.json" -print0)

  # Rule 2: no unredacted "token" value in invite-token proof files
  # Scope: files named *invite-token* (excludes csrf files, version files, etc.)
  # Matches: "token": "<value>" where value is NOT [REDACTED] and is >= 8 chars
  while IFS= read -r -d '' f; do
    if node -e "
const fs=require('fs');
const content=fs.readFileSync(process.argv[1],'utf8');
const pattern=/\"token\"\s*:\s*\"(?!\[REDACTED\])[^\"]{8,}\"/;
process.exit(pattern.test(content)?1:0);
" "${f}" 2>/dev/null; then
      : # clean
    else
      echo "FAIL: unredacted invite token in: ${f}"
      FAIL=1
    fi
  done < <(find "${dir}" -type f -name "*invite-token*" -print0)

done

if [[ "${FAIL}" -eq 0 ]]; then
  echo "PASS: No token leaks in proof artifacts"
  exit 0
else
  echo "FAIL: Token leak detected in proof artifacts — see above"
  exit 1
fi
