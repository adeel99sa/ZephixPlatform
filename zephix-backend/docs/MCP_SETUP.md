# MCP Setup for Zephix

## Supported MCP Servers

- `railway-mcp`
- `github-mcp`
- `filesystem-mcp`

These are the only enabled servers because they cover daily Zephix workflows:
deployment context (Railway), PR/repo operations (GitHub), and scoped file access (filesystem).

## Setup

```bash
cd zephix-backend
./scripts/setup-mcp.sh
```

This installs MCP servers as repository dev dependencies in the repo root. No global installs are required.

## Required Tokens

```bash
export RAILWAY_TOKEN='...'
export GITHUB_TOKEN='...'
```

Do not commit tokens to git.

## Verification

```bash
bash scripts/mcp/health.sh
```

Restart Cursor after changing MCP configuration.
