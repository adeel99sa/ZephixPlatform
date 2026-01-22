#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
find zephix-backend/src -type f -name "*.controller.ts" | wc -l | tr -d ' '
