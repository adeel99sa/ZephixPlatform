# ADR-B2-001 — Three-stage enum rename for `complexity_mode`

**Status:** Accepted (2026-05-09).
**Build:** B2.

## Context

AD-026 shipped `workspace_complexity_mode_enum` with values `simple | standard | advanced` (migration `18000000000080`). B2 PO requires `lean | standard | governed` for marketing alignment with platform tiers. Postgres enum value removal is destructive — `ALTER TYPE … DROP VALUE` does not exist; the only safe path is to swap the column to a freshly-created enum type.

## Decision

Three-stage migration coordinated across three PRs:

1. **PR1 / Stage 1** (`18000000000160`): `ALTER TYPE … ADD VALUE IF NOT EXISTS 'lean'` and `'governed'`. `simple` and `advanced` remain valid. Column default stays `'simple'`. No row updates. Forward-only — `down()` is a partial rollback (Postgres cannot remove enum values without a type swap; documented in migration body).
2. **PR2 / Stage 2** (`18000000000170`): `UPDATE workspaces SET complexity_mode = 'lean' WHERE complexity_mode = 'simple'`; `UPDATE … 'governed' WHERE … 'advanced'`. `ALTER COLUMN … SET DEFAULT 'lean'`. `standard` rows untouched.
3. **PR3 / Stage 3** (`18000000000180`, post-7-day soak): create new enum type with only `lean | standard | governed`; `ALTER COLUMN … TYPE … USING …::text::…`; drop old type; rename new type to original name. `down()` rebuilds the legacy type and reverse-maps `governed→advanced`, `lean→simple`.

Feature flag `B2_TENANCY_V2_ENABLED` gates the cutover behavior in PR2 (HTTP endpoints, Programs gating, snapshot wiring). PR1 ships dormant.

## Consequences

- **+** Each stage is reversible (Stage 1 is the only forward-only stage, and only because Postgres cannot remove enum values cleanly — Stage 1 alone has no behavior change so the partial rollback is acceptable).
- **+** No behavior change in PR1; Stream B's frontend PR can land in parallel without coordination.
- **+** Stage 2 backfill is small (single-table UPDATE with two equality clauses) and safe under online traffic.
- **−** Three migrations instead of one.
- **−** Stage 3 column-type swap requires `USING complexity_mode::text::…` cast and full table rewrite. On staging the table is small (low single-digit thousands of rows); on production this needs a staging soak verification before promotion.
- **−** Any code that pattern-matches on `simple`/`advanced` strings (greps confirm: none in PR1 scope) must be updated by PR3 cutover.

## Alternatives considered

- **Single migration with backfill + type swap**: rejected — too much risk surface in one step; no staged rollback; no flag-gated soak window.
- **Add `target_complexity_mode` column with new vocabulary, dual-read**: rejected — leaves two columns of truth; long-term cleanup tax; no benefit over enum-add-and-drop.
