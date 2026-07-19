# Known debt — complexity-mode taxonomy drift + the SoD moat claim

**Status:** tracked. Surfaced by SOD-PORT-1 (#463, 2026-07-18).
**Scheduled:** Phase 1 — taxonomy ADR, alongside the OWASP remap. **Decision due
by 2026-08-01** (operator-adjustable). Escalate rather than let it sit.

## 1. Five complexity modes exist; the locked primitive is three

`WorkspaceComplexityMode` (workspace.entity.ts) has FIVE values:

- `LEAN` / `STANDARD` / `GOVERNED` — the locked three-tier primitive (B2).
- `SIMPLE` (deprecated, "backfilled to LEAN") and `ADVANCED` (deprecated,
  "backfilled to GOVERNED") — two extra values no current design doc names.

SOD-PORT-1's `selfApprovalAllowedForMode()` fails CLOSED on unknown, and maps
the deprecated pair to their B2 equivalents (SIMPLE→allow like LEAN,
ADVANCED→block like GOVERNED), so behaviour is correct today. But this is the
same **vocabulary-multiplying-without-a-canonical-source** drift class as the
conflicting engine-numbering schemes.

**Do (Phase 1 taxonomy ADR):** one canonical list of modes. Either RETIRE
`SIMPLE`/`ADVANCED` (migrate any remaining rows — staging live-read 2026-07-18
showed the column already holds `lean`/`standard`/`governed` values, so the enum
values may be vestigial) or DOCUMENT them explicitly as aliases with a removal
plan. The `@deprecated` comments say "B2 PR3 will remove" — close that loop.

## 2. The separation-of-duties moat claim is now mode-qualified

**Before SOD-PORT-1**, "phase gates enforce separation of duties" was an
UNCONDITIONAL, provable claim. **After**, the true statement is:

> Separation of duties is enforced in **GOVERNED** mode. **LEAN** and
> **STANDARD** permit self-approval with a **flagged receipt** (`self_resolved`
> on exceptions, `selfApproved` on gate/CR receipts).

This is the correct product call — it's what makes a solo-admin trial
completable — but it is a materially different claim. **Anywhere the KT doc,
roadmap, sales language, or threat model says "self-approval is banned," it now
needs the mode qualifier.** Carry the correction forward; do not discover it in
front of a buyer.

### Default-mode consequence (verify + decide)

Staging live-read 2026-07-18: **136 LEAN / 2 GOVERNED / 1 STANDARD**. The
effective default for new workspaces is **LEAN**, so **self-approval is permitted
(flagged) out of the box**; the ban is only visible in GOVERNED workspaces.

- Fine for trial completability.
- BUT the demo/sandbox project should probably be **GOVERNED**, or a prospect
  never sees the SoD ban actually work. Decide the demo default deliberately.
- Confirm what a freshly-created workspace defaults to at the app layer (entity
  column default is the deprecated `SIMPLE`; the live data is `lean`).
