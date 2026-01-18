#!/usr/bin/env bash
set -euo pipefail
ROOT="zephix-backend/src/modules"
echo "controller_files=$(find "$ROOT" -type f -name "*.controller.ts" | wc -l | tr -d ' ')"
echo "get_count=$(grep -R --include="*.controller.ts" -n "@Get(" "$ROOT" | wc -l | tr -d ' ')"
echo "post_count=$(grep -R --include="*.controller.ts" -n "@Post(" "$ROOT" | wc -l | tr -d ' ')"
echo "patch_count=$(grep -R --include="*.controller.ts" -n "@Patch(" "$ROOT" | wc -l | tr -d ' ')"
echo "delete_count=$(grep -R --include="*.controller.ts" -n "@Delete(" "$ROOT" | wc -l | tr -d ' ')"
