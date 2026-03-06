#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

EXPECTED_NODE="$(tr -d '[:space:]' < .nvmrc)"
EXPECTED_NODE_MAJOR="${EXPECTED_NODE%%.*}"
ACTUAL_NODE="$(node -v | sed 's/^v//')"
ACTUAL_NODE_MAJOR="${ACTUAL_NODE%%.*}"

if [[ "$ACTUAL_NODE_MAJOR" != "$EXPECTED_NODE_MAJOR" ]]; then
  echo "error: node major mismatch (expected $EXPECTED_NODE_MAJOR, got $ACTUAL_NODE_MAJOR)"
  exit 1
fi

[[ -f "$ROOT_DIR/node_modules/@railway/mcp-server/dist/index.js" ]] || {
  echo "error: missing railway MCP entrypoint"
  exit 1
}
[[ -f "$ROOT_DIR/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js" ]] || {
  echo "error: missing filesystem MCP entrypoint"
  exit 1
}
[[ -f "$ROOT_DIR/node_modules/@modelcontextprotocol/server-github/dist/index.js" ]] || {
  echo "error: missing github MCP entrypoint"
  exit 1
}
[[ -f "$ROOT_DIR/.cursor/mcp.json" ]] || {
  echo "error: missing .cursor/mcp.json"
  exit 1
}

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "warn: RAILWAY_TOKEN is not set"
fi
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "warn: GITHUB_TOKEN is not set"
fi

echo "mcp_test=ok"
