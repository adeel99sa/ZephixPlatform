Name
mcp-operations

Description
Use when tasks involve Railway, GitHub, filesystem MCP, environment sync, deployment logs, or repo automation.

Instructions

Use repo scoped MCP servers. No global installs.

Never store tokens in repo. Use env vars only.

For Railway debugging, fetch logs then map to code location and propose minimal patch.

For GitHub, use it for PR review, diff summaries, and issue linking.

Validation

bash scripts/mcp/health.sh must return mcp_health=ok
