# ADR-B2-FE-004 — Programs: governed tier for mutations; read-only elsewhere

## Context

Programs are a governed-tier capability. Existing programs must remain visible so organizations are not stranded after tier changes.

## Decision

**`ProgramsTierGate`** (flagged via **`B2_TENANCY_V2_ENABLED`**) hides governed-only creation/editing when workspace mode is not **`governed`**, and surfaces an explanatory banner. Read-only access to existing programs is preserved (PR2 wiring).

## Consequences

- Clear upgrade path messaging.
- Requires coordination with work-management surfaces that embed Programs (B7).

## Status

Accepted — Build 2 frontend PR2+.
