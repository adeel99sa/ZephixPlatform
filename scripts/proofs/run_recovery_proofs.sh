#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/proofs/recovery"
CMDS="$OUT/commands"

mkdir -p "$CMDS"

ts() { date +"%Y-%m-%d %H:%M:%S %Z"; }

echo "Generated: $(ts)" > "$OUT/RAW_OUTPUTS.md"
echo "" >> "$OUT/RAW_OUTPUTS.md"
echo "Index:" >> "$OUT/RAW_OUTPUTS.md"

run() {
  local name="$1"
  shift
  local file="$CMDS/$name.txt"
  echo "## $name" > "$file"
  echo "Time: $(ts)" >> "$file"
  echo "Cmd: $*" >> "$file"
  echo "" >> "$file"
  (cd "$ROOT" && eval "$*") >> "$file" 2>&1
  echo "- $name: commands/$name.txt" >> "$OUT/RAW_OUTPUTS.md"
}

run "10_backend_counts" \
  "cd zephix-backend && \
   echo 'files_total:' && find src -type f | wc -l | tr -d ' ' && \
   echo 'ts_files:' && find src -type f -name '*.ts' | wc -l | tr -d ' ' && \
   echo 'modules:' && find src/modules -maxdepth 1 -type d -print | wc -l | tr -d ' ' && \
   echo 'controllers:' && find src/modules -type f -name '*.controller.ts' | wc -l | tr -d ' ' && \
   echo 'services:' && find src/modules -type f -name '*.service.ts' | wc -l | tr -d ' ' && \
   echo 'entities:' && find src -type f -name '*.entity.ts' | wc -l | tr -d ' ' && \
   echo 'spec_files:' && find src -type f -name '*.spec.ts' | wc -l | tr -d ' '"

run "20_frontend_counts" \
  "cd zephix-frontend && \
   echo 'files_total:' && find src -type f | wc -l | tr -d ' ' && \
   echo 'ts_files:' && find src -type f -name '*.ts' | wc -l | tr -d ' ' && \
   echo 'tsx_files:' && find src -type f -name '*.tsx' | wc -l | tr -d ' ' && \
   echo 'pages_tsx:' && find src/pages -type f -name '*.tsx' | wc -l | tr -d ' ' && \
   echo 'components_files:' && find src/components -type f | wc -l | tr -d ' ' && \
   echo 'features_files:' && find src/features -type f | wc -l | tr -d ' ' && \
   echo 'test_files:' && find src -type f \\( -name '*.test.ts' -o -name '*.test.tsx' \\) | wc -l | tr -d ' '"

run "30_db_counts" \
  "cd zephix-backend && \
   echo 'migrations:' && find src/migrations -type f | wc -l | tr -d ' ' && \
   echo 'entities:' && find src -type f -name '*.entity.ts' | wc -l | tr -d ' '"

run "40_backend_build" \
  "cd zephix-backend && npm run build 2>&1 | head -n 50"

run "41_frontend_build" \
  "cd zephix-frontend && npm run build 2>&1 | head -n 50"

run "42_route_counts" \
  "bash proofs/recovery/scripts/count_routes.sh && \
   echo '' && \
   echo 'Total endpoints:' && \
   bash -c 'source <(grep -E \"^(get_count|post_count|patch_count|delete_count)=\" proofs/recovery/commands/42_route_counts.txt | sed \"s/=/=\$((/; s/\$/))/\") && echo \$((get_count + post_count + patch_count + delete_count))'"

echo "" >> "$OUT/RAW_OUTPUTS.md"
echo "Done: $(ts)" >> "$OUT/RAW_OUTPUTS.md"
