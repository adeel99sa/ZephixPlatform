Name
tenancy-security

Description
Use when endpoints require workspace header, org boundaries, auth, csrf, role scopes, or any change touches tenant context.

Instructions

Confirm tenant context source in pipeline. Middleware, guard, interceptor.

Enforce workspace header on all protected endpoints if required by backend.

Never accept orgId or workspaceId from untrusted query if backend derives it from auth.

Preserve control plane vs data plane separation. No cross boundary leaks.

Do not bypass auth in production code. Only in tests with explicit helpers.

Validation

run tenancy bypass scripts if present in scripts

ensure 401 and 403 behave correctly for missing headers
