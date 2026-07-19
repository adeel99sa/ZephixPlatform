# Known debt — `getUserRole` reads the owner scalar before the authoritative member row

**Status:** tracked. Surfaced by ATOMICITY-1 4.4 (#468, 2026-07-19).
**Scheduled:** Phase 1, alongside the taxonomy ADR + OWASP remap. **Decision due
by 2026-08-01** (operator-adjustable). Escalate rather than let it sit.

## The weakness

`WorkspacesService.getUserRole` ([workspaces.service.ts:263](../../zephix-backend/src/modules/workspaces/workspaces.service.ts))
resolves OWNER from **the scalar `workspaces.owner_id` FIRST**:

```ts
if (workspace.ownerId === userId) return { role: 'OWNER', canWrite: true, ... }; // scalar — checked first
// ...only then falls back to:
const membership = await this.memberRepo.findOne({ where: { workspaceId, userId, status: 'active' } });
if (membership?.role === 'workspace_owner') return { role: 'OWNER', ... };        // member row — the authoritative source
```

We ruled (ATOMICITY-1 4.4) that **the `workspace_members` owner row is
authoritative** and the scalar is a denormalized cache. But the read consults
the cache *before* the source, so a **stale scalar produces a false OWNER** — e.g.
before reconciliation, GovProofFinal's `owner_id` named a non-member verification
account (`750d0c15`) which was being reported as OWNER on the `GET
/workspaces/:id/role` display endpoint, even though the authoritative owner row
belongs to `cc8b50df`.

## Why fixing the data alone is not enough

ATOMICITY-1 4.4 does two things: transaction-binds the writes (stops NEW
divergence) and reconciles the existing diverged rows (migration 219). But **the
read ordering is the underlying weakness** — fix the data without fixing the read
and the same false-OWNER display returns the moment any untransactioned path
writes the scalar again.

The reads are display-only (the `/role` endpoint is UX-only, API authoritative;
nothing in the gate / exception / approval-chain / receipt path reads
`owner_id`), so this is not an enforcement hole today. But it is a correctness
weakness on a governance product's role reporting.

## Do (Phase 1)

Make `getUserRole` read the **member row as authoritative** — check
`workspace_members` first, use the scalar only as a fallback (or retire the
scalar-first branch entirely once every write path is transaction-bound). Then
the scalar can never over-report OWNER. Relates to
[[complexity-mode-taxonomy-and-sod-claim]] (same "denormalized value drifts from
the source of truth" class).
