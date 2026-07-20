# Approvals DTO `decidedAt` stands in for a missing `resolved_at` column

**Status:** known debt (intentional, not to be fixed now) · **Surfaced by:** GOV-BUILD WAVE-1 Unit 5.5 (2026-07-19)

The admin Approvals tab (`GET /admin/governance-exceptions/approvals`, `toApprovalDto`)
returns a `decidedAt` timestamp for each resolved decision. `governance_exceptions`
has **no dedicated `resolved_at` column** — only `created_at` / `updated_at`. Since a
resolved row's last write IS its resolution (the `resolve()` / consume path), `decidedAt`
is populated from the terminal `updated_at`.

**Why not fix now:** adding a column mid-wave for a display-only timestamp is not worth a
migration. The value is honest and flagged in the DTO comment; it is only imprecise if a
resolved row is later updated for some non-resolution reason (none exist today). When a
governance-decision model is built (or the next `governance_exceptions` migration lands
for another reason), add `resolved_at` set at `resolve()`-time and point `decidedAt` at it.

No frontend action required — the field name is stable; only its precision improves later.
