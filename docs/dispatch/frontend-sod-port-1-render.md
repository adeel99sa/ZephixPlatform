# Frontend follow-up (Cursor lane) — render self-approval flags (SOD-PORT-1)

**Context:** SOD-PORT-1 (backend, #463, merged to staging) added mode-scoped
self-approval. In LEAN/STANDARD workspaces a requester MAY approve their own
exception / change request / gate; in GOVERNED it is blocked. When it IS
permitted, the backend records it so it is never mistaken for peer review. Those
flags are now on the wire but **nothing renders them yet** — this closes that gap.

**Not urgent, not blocking #456/#458/#459.** Small, additive.

## Two data points, already emitted by the backend

1. **Exceptions** — `self_resolved: boolean` is on the governance-exception:
   - raw entity from `GET /admin/governance/exceptions` (the queue),
   - `ProjectExceptionView` (member project view),
   - audit metadata (`EXCEPTION_RESOLUTION.selfResolved`).
2. **Gate approvals** — `selfApproved: true` on the `GATE_APPROVAL_STEP_APPROVED`
   activity metadata.
3. **Change requests** — self-approval is plainly derivable on the row
   (`approvedByUserId === createdByUserId`); also emitted on the CR domain event
   `meta.selfApproved`.
   > **NOTE (SOD-CONSISTENCY-1, 2026-07-19):** CR self-approval only became
   > reachable on **2026-07-19**. The controller previously never passed
   > `organizationId`, so every CR self-approval fail-closed regardless of mode —
   > no self-approved CR row could exist before that date. The render contract is
   > unchanged; just don't expect self-approved CR data on workspaces older than
   > the fix.

## Render it in two places

- **Exception queue rows** (and the pending/approvals views): where a resolved
  exception shows its resolver, add a badge/label like **"Self-approved"** when
  `self_resolved` is true. It must read as *distinct from* peer review.
- **The block banner** / governance surface where an exception or gate approval
  is shown: same treatment — a self-approval must be visibly labelled, not shown
  as if a separate approver signed off.

**Copy guidance:** neutral, factual — e.g. "Self-approved (no separate
approver)". This is honest disclosure, not a warning; LEAN/STANDARD self-approval
is a permitted, deliberate product behaviour.

## Why it matters

The whole point of the flag is that a self-approval is never displayed as peer
review. Persisted-but-not-rendered is exactly the "honesty primitive nobody can
see" anti-pattern this program is eliminating.

## UX gap (add with this item) — disable Approve for the submitter

When GOVERNED blocks self-approval, the gate panel must not let the submitter
click into a raw 403. Same honesty principle as the block banner: explain the
state, don't just refuse.

- If the current user is the submission's `submittedByUserId` (and self-approval
  is not permitted for the workspace mode), **disable Approve** and show:
  *"You submitted this gate; a separate approver is required."*
- Do not surface a raw error toast as the first encounter with the moat.
- Peer approvers keep Approve enabled as today.

