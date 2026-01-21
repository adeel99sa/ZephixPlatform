#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
find zephix-frontend/src/pages -type f -name "*.tsx" | wc -l | tr -d ' '
