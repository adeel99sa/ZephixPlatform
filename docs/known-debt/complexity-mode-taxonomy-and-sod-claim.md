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

> **CORRECTION (SOD-CONSISTENCY-1, 2026-07-19):** the parenthetical above was
> aspirational, not true, for **change requests**. SOD-PORT-1 wired the predicate
> into the CR *service* but the CR *controller* never passed `organizationId` onto
> the actor, so the check fail-closed on EVERY CR self-approval regardless of mode.
> LEAN/STANDARD self-approval worked on **two** of three surfaces (gate,
> exception); CR honoured the mode only **from 2026-07-19**. See §3.

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
- BUT the demo/sandbox project should be **GOVERNED**, or a prospect never sees
  the SoD ban actually work. (GovProofFinal `84d46f51` IS already `governed` —
  it's one of the 2. The seeded org / sandbox / whatever the 5 testers land in
  must be GOVERNED too. Belongs in the demo-seed lane spec, before it's written.)

### CONFIRMED (staging live-read 2026-07-19): it is an UNSET default, not a choice

- DB column default is **`'lean'`** (`workspaces.complexity_mode`).
- `WorkspacesService` **never sets `complexityMode` on create** — a new workspace
  simply inherits the `'lean'` column default. So "136 LEAN" is **136 rows that
  took the default**, not 136 deliberate decisions.
- (The entity's `@Column` default is the deprecated `SIMPLE`; the DB default is
  `lean` — another taxonomy mismatch to reconcile in the ADR.)

**The real question is what a NEW CUSTOMER should get, and the answer is a
product decision — operator's read is `STANDARD`, not `LEAN`:** gates present and
warning, enforcement one toggle away, so the value is visible and the block is
opt-in. Changing it is a one-line DB default flip + set-on-create, but it is a
DEFAULTS/PRODUCT decision, not a code cleanup — hence tracked here, not changed
unilaterally.

## 3. SOD-CONSISTENCY-1 (fixed 2026-07-19) — CR surface was never governed

**Symptom:** on STANDARD workspace `feb22424`, gate self-approval SUCCEEDED
(proof 2, submission `5868c937`) but CR self-approval returned
`SELF_APPROVAL_FORBIDDEN` with a "governed workspace" message. Same workspace,
same mode, two behaviours.

**Root cause — one un-passed field, not a mode-resolution bug:** the CR HTTP
controller built the approve/reject actor WITHOUT `organizationId`
(`ActorContext.organizationId` was optional, so it compiled clean). The service's
`resolveSelfApprovalMode` fails closed on an absent org — correctly — but the org
was ALWAYS absent, so the workspace mode was never even read. The "governed
workspace" copy was **hardcoded**, fired on any fail-closed, and was a red herring.

**Blast radius (the actual finding):** the same missing `actor.organizationId`
also silently disabled, on the entire CR HTTP surface —
- **governance rule evaluation** (`change-requests.service.ts` — `if (this.governanceEngine && actor.organizationId)`); CR approvals never ran governance rules; and
- **KPI domain events** on approve/reject/implement (same `if (actor.organizationId)` gate).

CR was a governance surface that had never been governed.

**Fix (this PR):**
1. Controller populates `organizationId: auth.organizationId` on every CR actor.
2. `ActorContext.organizationId` is now **required** — a controller that starves
   it fails to compile. (Verified: budgets/scenarios use their own distinct actor
   types and were unaffected; no fourth surface.)
3. Both the CR and exception `SELF_APPROVAL_FORBIDDEN` messages are now
   mode-aware: a genuine GOVERNED ban reads differently from a fail-closed on an
   unresolvable mode, and `resolveSelfApprovalMode` WARNs loudly (never silently
   no-ops) if org is ever absent.

## 4. Sprint bar (proposed) — governance inputs may not fail silently

This is the **third** instance of one class: an optional field or permissive
default causing a governance behaviour to silently NOT happen —
- `isEvaluable` phantom-allow (GOV-FIX-B1),
- `projectId`-missing gate-receipt drop (GATE-RECEIPT-1),
- `organizationId`-missing evaluation skip (this one).

Each fails silently, each looks like nothing is wrong, each **disables**
governance rather than raising an error.

> **Bar:** any guard of the form `if (governanceInput) { evaluate }` MUST either
> have a **required** input (type-enforced) or emit a **loud WARN** when the input
> is absent. Governance that quietly does not run is worse than governance that
> errors.

Sits alongside the atomicity rule (tx + pessimistic lock + affected-rows=1).

## 5. SoD forbidden-error reads the same for a genuine ban and a fail-closed (GOV-UNIFY-1)

Surfaced by GOV-BUILD Wave-1 surface-3 verification (2026-07-20). `selfApprovalAllowedForMode`
returns `false` for BOTH a genuine GOVERNED/ADVANCED workspace AND an unknown/unresolvable
mode (fail-closed). The CR `approve` surface then throws the SAME `SELF_APPROVAL_FORBIDDEN`
error for both; the two cases are distinguishable ONLY by parsing the resolved mode out of
the message sentence (a live GOVERNED probe returned `"…in a GOVERNED workspace…"`).

`selfApprovalForbiddenError(mode, subject)` was intended to make those two cases **read
differently** — a genuine separation-of-duties ban vs "we couldn't determine your mode, so we
blocked to be safe." Today they don't, except in prose.

**Why it matters:** this is the same trap that made surface-3's `governance_evaluations`
assertion a false discriminator — a check that passes without proving what it claims. Any
proof for the OTHER two SoD surfaces (gate, exception) that asserts on the forbidden-error
will inherit the ambiguity: a fail-closed reads as a ban. The clean discriminator is the
externally-verified resolved mode of the workspace, not the error string.

Not a fix now — belongs to GOV-UNIFY-1 (owns the vocabulary work): give the ban and the
fail-closed **distinct, machine-readable** codes/reasons across all three SoD surfaces so a
proof can assert on a field, not a sentence.
