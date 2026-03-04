#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

EXPECTED_NODE="$(tr -d '[:space:]' < .nvmrc)"
EXPECTED_NODE_MAJOR="${EXPECTED_NODE%%.*}"
ACTUAL_NODE="$(node -v | sed 's/^v//')"
ACTUAL_NODE_MAJOR="${ACTUAL_NODE%%.*}"
HAS_FAILURE=0

echo "== MCP Health Check =="
echo "repo_root=$ROOT_DIR"
echo "node_version=$ACTUAL_NODE"
echo "expected_node=$EXPECTED_NODE"

if [[ "$ACTUAL_NODE_MAJOR" != "$EXPECTED_NODE_MAJOR" ]]; then
  echo "error: node major mismatch (expected $EXPECTED_NODE_MAJOR, got $ACTUAL_NODE_MAJOR)"
  HAS_FAILURE=1
fi

RW_ENTRY="$ROOT_DIR/node_modules/@railway/mcp-server/dist/index.js"
FS_ENTRY="$ROOT_DIR/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js"
GH_ENTRY="$ROOT_DIR/node_modules/@modelcontextprotocol/server-github/dist/index.js"

echo "railway_mcp_entry=$RW_ENTRY"
[[ -f "$RW_ENTRY" ]] && echo "railway_mcp_entry_exists=yes" || {
  echo "railway_mcp_entry_exists=no"
  exit 1
}

echo "filesystem_mcp_entry=$FS_ENTRY"
[[ -f "$FS_ENTRY" ]] && echo "filesystem_mcp_entry_exists=yes" || {
  echo "filesystem_mcp_entry_exists=no"
  exit 1
}

echo "github_mcp_entry=$GH_ENTRY"
[[ -f "$GH_ENTRY" ]] && echo "github_mcp_entry_exists=yes" || {
  echo "github_mcp_entry_exists=no"
  exit 1
}

if [[ -n "${RAILWAY_TOKEN:-}" ]]; then
  echo "railway_token_set=yes"
else
  echo "railway_token_set=no"
  echo "error: set RAILWAY_TOKEN in your shell before using railway-mcp"
  HAS_FAILURE=1
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "github_token_set=yes"
else
  echo "github_token_set=no"
  echo "error: set GITHUB_TOKEN in your shell before using github-mcp"
  HAS_FAILURE=1
fi

if [[ "$HAS_FAILURE" -ne 0 ]]; then
  echo "mcp_health=failed"
  exit 1
fi

echo "mcp_health=ok"
