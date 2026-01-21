#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
find zephix-backend/src -type d -name "*migrations*" -print0 \
  | xargs -0 -I {} find "{}" -type f -name "*.ts" \
  | wc -l | tr -d ' '
