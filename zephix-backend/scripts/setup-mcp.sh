#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "== MCP setup =="
echo "repo_root=$ROOT_DIR"

npm install -D \
  @railway/mcp-server@0.1.8 \
  @modelcontextprotocol/server-filesystem@2026.1.14 \
  @modelcontextprotocol/server-github@2025.4.8

echo "Next steps:"
echo "export RAILWAY_TOKEN='...'"
echo "export GITHUB_TOKEN='...'"
echo "bash scripts/mcp/health.sh"
echo "Restart Cursor to load MCP configuration."
