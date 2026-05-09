# ADR-B2-FE-003 — `complexity_mode` UI vocabulary matches backend enum

## Context

The platform renamed workspace complexity tiers to **`lean`**, **`standard`**, **`governed`** (aligned with Stream A). Mixed labeling increases support burden and breaks correlation with audit logs.

## Decision

Frontend stores and displays modes using the same tokens: labels **Lean**, **Standard**, **Governed** map 1:1 to **`lean` \| `standard` \| `governed`**. No separate translation map.

## Consequences

- Renames require coordinated backend + frontend releases.
- Template “complexity” badges (derived from template shape) remain unrelated and unchanged.

## Status

Accepted — Build 2 frontend.
