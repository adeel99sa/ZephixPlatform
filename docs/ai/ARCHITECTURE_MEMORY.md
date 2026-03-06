A. Platform boundaries

- Separate control plane concerns (governance, access, orchestration) from data plane concerns (workspace-scoped domain data).
- Treat workspace as the primary data boundary for operational data access.
- Treat organization as the governance boundary for roles, policy, and ownership.
- AI features are advisory by default; no persistent mutation should happen without explicit user action through product flows.

B. Tenancy contract

- Tenant context is resolved from authenticated request context plus validated workspace context.
- Enforce required workspace context headers where backend routes require them.
- Respect existing guards/middleware/interceptors that enforce tenant scope.
- Forbidden patterns:
  - Taking `organizationId` or `workspaceId` from untrusted query/body when backend derives scope from auth/context.
  - Cross-workspace data access without explicit allowed scope.
  - Header bypasses that skip tenancy checks.

C. Module contract enforcement

- Use public module services/interfaces for cross-module calls.
- Do not import private/internal module files across module boundaries.
- Add/maintain contract tests for inter-module behavior where integration depends on route/service contracts.
- Avoid circular dependencies between modules.

D. Auth contract

- Token issuance and validation must follow existing auth module flows and configured guards.
- Local auth behavior depends on configured environment keys already required by backend startup and auth modules.
- Preserve existing cookie/session and bearer behavior; do not change auth transport semantics without explicit scope.

E. Build, gate, release

- Local harness: use existing setup scripts and health/version endpoints for verification.
- Run targeted checks first, then lane-level gating checks.
- Staging smoke must confirm readiness/version plus critical auth flow behavior.
- Keep proof artifacts as command outputs and minimal evidence needed for reproducibility.

F. Do not do list

- Do not change unrelated files.
- Do not refactor for style only.
- Do not invent endpoints, headers, or contracts.
- Do not assume missing facts; search the repository and rules first.
